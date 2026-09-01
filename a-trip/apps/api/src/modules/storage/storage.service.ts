import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';

/** Only raster formats a browser can render inline. No SVG: it can carry script. */
const ALLOWED_MIME = new Map<string, string>([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/avif', 'avif'],
  ['image/gif', 'gif'],
]);

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/**
 * Magic-number checks. A client-supplied Content-Type is trivially forged, so
 * the first bytes decide what the file actually is.
 */
function sniffMime(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png';
  }
  if (buffer.subarray(0, 3).toString('ascii') === 'GIF') return 'image/gif';
  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') {
    return 'image/webp';
  }
  // AVIF and other ISO-BMFF files declare their brand in the ftyp box.
  if (buffer.subarray(4, 8).toString('ascii') === 'ftyp') {
    const brand = buffer.subarray(8, 12).toString('ascii');
    if (brand.startsWith('avif') || brand.startsWith('avis')) return 'image/avif';
  }
  return null;
}

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  /** Base URL the browser uses; differs from the internal endpoint in Docker. */
  private readonly publicUrl: string;

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>('S3_ENDPOINT', 'http://localhost:9000');
    this.bucket = this.config.get<string>('S3_BUCKET', 'atrip-uploads');
    this.publicUrl = this.config
      .get<string>('S3_PUBLIC_URL', endpoint)
      .replace(/\/+$/, '');

    this.client = new S3Client({
      endpoint,
      region: this.config.get<string>('S3_REGION', 'us-east-1'),
      // MinIO serves buckets as a path segment, not a DNS subdomain.
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.config.get<string>('S3_ACCESS_KEY', 'minioadmin'),
        secretAccessKey: this.config.get<string>('S3_SECRET_KEY', 'minioadmin'),
      },
    });
  }

  /**
   * Creates the bucket and marks it publicly readable if it is missing, so a
   * fresh volume needs no manual setup. Failures are logged, not fatal — the
   * API must still boot when object storage is down.
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Using bucket "${this.bucket}"`);
    } catch {
      try {
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
        await this.client.send(
          new PutBucketPolicyCommand({
            Bucket: this.bucket,
            Policy: JSON.stringify({
              Version: '2012-10-17',
              Statement: [
                {
                  Effect: 'Allow',
                  Principal: { AWS: ['*'] },
                  Action: ['s3:GetObject'],
                  Resource: [`arn:aws:s3:::${this.bucket}/*`],
                },
              ],
            }),
          }),
        );
        this.logger.log(`Created public-read bucket "${this.bucket}"`);
      } catch (error) {
        this.logger.warn(
          `Object storage unavailable — uploads will fail until it is reachable: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }

  /** Stores one image and returns the URL a browser can load it from. */
  async uploadImage(file: Express.Multer.File, prefix = 'hotels'): Promise<string> {
    if (!file?.buffer?.length) throw new BadRequestException('No file received');
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new BadRequestException(`Image must be ${MAX_UPLOAD_BYTES / 1024 / 1024}MB or smaller`);
    }

    const sniffed = sniffMime(file.buffer);
    if (!sniffed || !ALLOWED_MIME.has(sniffed)) {
      throw new BadRequestException('Only JPEG, PNG, WebP, AVIF or GIF images are allowed');
    }

    // The stored name is generated, never derived from the client filename, so
    // path traversal and collisions are impossible.
    const key = `${prefix}/${randomUUID()}.${ALLOWED_MIME.get(sniffed)}`;

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: sniffed,
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );
    } catch (error) {
      // Storage being down is an infrastructure problem, not a bad request —
      // say so plainly instead of surfacing a bare 500 to the admin.
      this.logger.error(
        `Upload of ${key} failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new ServiceUnavailableException(
        'Image storage is unavailable right now. Please try again in a moment.',
      );
    }

    return `${this.publicUrl}/${this.bucket}/${key}`;
  }

  /** Best-effort cleanup; a missing object is not an error worth surfacing. */
  async deleteByUrl(url: string): Promise<void> {
    const prefix = `${this.publicUrl}/${this.bucket}/`;
    if (!url.startsWith(prefix)) return;
    const key = url.slice(prefix.length);
    if (!key) return;

    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch (error) {
      this.logger.warn(
        `Could not delete ${key}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

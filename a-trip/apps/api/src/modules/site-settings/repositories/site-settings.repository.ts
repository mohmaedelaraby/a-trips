import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type { SiteSetting } from '../../../generated/prisma/client';

@Injectable()
export class SiteSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Only the two columns the public map needs — this runs on every page. */
  findKeyValues(): Promise<Array<{ key: string; value: string }>> {
    return this.prisma.siteSetting.findMany({ select: { key: true, value: true } });
  }

  findAll(): Promise<SiteSetting[]> {
    return this.prisma.siteSetting.findMany();
  }

  findByKey(key: string): Promise<SiteSetting | null> {
    return this.prisma.siteSetting.findUnique({ where: { key } });
  }

  upsert(input: { key: string; value: string; group: string; label: string }) {
    return this.prisma.siteSetting.upsert({
      where: { key: input.key },
      create: input,
      update: { value: input.value },
    });
  }

  /** deleteMany, not delete: resetting a key that was never stored is a no-op. */
  delete(key: string) {
    return this.prisma.siteSetting.deleteMany({ where: { key } });
  }
}

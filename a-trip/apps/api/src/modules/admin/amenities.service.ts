import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Locale } from '../../generated/prisma/enums';
import type { AmenityDto } from './dto/amenity.dto';

@Injectable()
export class AmenitiesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Each amenity is returned with how many hotels currently list it. */
  async list() {
    const [amenities, hotels] = await Promise.all([
      this.prisma.amenity.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] }),
      this.prisma.hotel.findMany({ select: { amenities: true } }),
    ]);

    const usage = new Map<string, number>();
    for (const hotel of hotels) {
      for (const name of hotel.amenities) {
        usage.set(name, (usage.get(name) ?? 0) + 1);
      }
    }

    // One query for every amenity's translations rather than one per row.
    const rows = await this.prisma.translation.findMany({
      where: { key: { in: amenities.map((a) => `amenity.${a.name}`) } },
      select: { key: true, locale: true, value: true },
    });
    const byName = new Map<string, Record<string, string>>();
    for (const row of rows) {
      const name = row.key.slice('amenity.'.length);
      const entry = byName.get(name) ?? {};
      entry[row.locale] = row.value;
      byName.set(name, entry);
    }

    return amenities.map((amenity) => ({
      id: amenity.id,
      name: amenity.name,
      category: amenity.category,
      hotelCount: usage.get(amenity.name) ?? 0,
      translations: byName.get(amenity.name) ?? {},
    }));
  }

  async create(dto: AmenityDto) {
    const name = dto.name.trim();
    const existing = await this.prisma.amenity.findUnique({ where: { name } });
    if (existing) throw new BadRequestException('That amenity already exists');
    const amenity = await this.prisma.amenity.create({
      data: { name, category: dto.category?.trim() || null },
    });
    await this.saveTranslations(name, dto.translations);
    return amenity;
  }

  /**
   * Writes an amenity's per-locale display text. Keyed by name rather than id
   * so rendering a hotel — which stores amenity names, not ids — needs no extra
   * lookup. A blank value clears the override and the English shows through.
   */
  private async saveTranslations(name: string, translations?: Record<string, string>) {
    if (!translations) return;
    const key = `amenity.${name}`;
    for (const [locale, raw] of Object.entries(translations)) {
      const value = (raw ?? '').trim();
      if (!value) {
        await this.prisma.translation.deleteMany({ where: { key, locale: locale as Locale } });
        continue;
      }
      await this.prisma.translation.upsert({
        where: { key_locale: { key, locale: locale as Locale } },
        create: { key, locale: locale as Locale, value },
        update: { value },
      });
    }
  }

  /**
   * Renaming an amenity rewrites it on every hotel that lists it.
   *
   * Hotel.amenities is a String[] of names, not a relation, so the catalogue row
   * and the hotels that use it are only joined by the string itself. Updating
   * the catalogue alone would leave hotels holding the old name: the amenity
   * would silently stop matching the search filter, and its usage count here
   * would drop to zero, with nothing appearing to fail.
   *
   * Both writes go in one transaction so a rename can never land half-applied.
   */
  async update(id: string, dto: AmenityDto) {
    const current = await this.assertExists(id);
    const name = dto.name.trim();

    if (name !== current.name) {
      const clash = await this.prisma.amenity.findUnique({ where: { name } });
      if (clash) throw new BadRequestException('Another amenity already has that name');
    }

    const [amenity] = await this.prisma.$transaction([
      this.prisma.amenity.update({
        where: { id },
        data: { name, category: dto.category?.trim() || null },
      }),
      ...(name !== current.name
        ? [
            this.prisma.$executeRaw`
              UPDATE "Hotel"
              SET "amenities" = array_replace("amenities", ${current.name}, ${name})
              WHERE ${current.name} = ANY("amenities")
            `,
            // Translations are keyed `amenity.<name>`, so the key moves with the
            // rename. Without this the Arabic would silently detach and every
            // hotel listing the amenity would fall back to English.
            this.prisma.$executeRaw`
              UPDATE "Translation"
              SET "key" = ${`amenity.${name}`}
              WHERE "key" = ${`amenity.${current.name}`}
            `,
          ]
        : []),
    ]);

    // After the rename, so this writes to the new key rather than the old one.
    await this.saveTranslations(name, dto.translations);

    return amenity;
  }

  /** Deleting drops the amenity from every hotel that lists it, for the same reason. */
  async remove(id: string) {
    const current = await this.assertExists(id);

    await this.prisma.$transaction([
      this.prisma.$executeRaw`
        UPDATE "Hotel"
        SET "amenities" = array_remove("amenities", ${current.name})
        WHERE ${current.name} = ANY("amenities")
      `,
      // Otherwise the translations outlive the amenity as unreachable rows.
      this.prisma.translation.deleteMany({ where: { key: `amenity.${current.name}` } }),
      this.prisma.amenity.delete({ where: { id } }),
    ]);

    return { id, deleted: true };
  }

  private async assertExists(id: string) {
    const amenity = await this.prisma.amenity.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
    if (!amenity) throw new NotFoundException('Amenity not found');
    return amenity;
  }
}

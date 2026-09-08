import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Locale } from '../../../generated/prisma/enums';
import type { Amenity } from '../../../generated/prisma/client';
import { amenityTranslationKey } from '../utils/amenity.util';

@Injectable()
export class AmenitiesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<Amenity[]> {
    return this.prisma.amenity.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] });
  }

  findById(id: string) {
    return this.prisma.amenity.findUnique({ where: { id }, select: { id: true, name: true } });
  }

  findByName(name: string) {
    return this.prisma.amenity.findUnique({ where: { name }, select: { id: true } });
  }

  /** Amenity names as they appear on hotels, for the usage counts. */
  listHotelAmenities(): Promise<Array<{ amenities: string[] }>> {
    return this.prisma.hotel.findMany({ select: { amenities: true } });
  }

  /** One query for every amenity's translations rather than one per row. */
  findTranslations(names: string[]) {
    return this.prisma.translation.findMany({
      where: { key: { in: names.map(amenityTranslationKey) } },
      select: { key: true, locale: true, value: true },
    });
  }

  create(name: string, category: string | null): Promise<Amenity> {
    return this.prisma.amenity.create({ data: { name, category } });
  }

  /**
   * Renames the amenity and rewrites it on every hotel that lists it, in one
   * transaction.
   *
   * `Hotel.amenities` is a String[] of names, not a relation, so the catalogue
   * row and the hotels using it are joined only by the string. Updating the
   * catalogue alone would leave hotels holding the old name: the amenity would
   * silently stop matching the search filter and its usage count would drop to
   * zero, with nothing appearing to fail. The translation key moves for the same
   * reason — it is keyed by name, so otherwise the Arabic detaches.
   */
  async renameCascade(id: string, from: string, to: string, category: string | null) {
    const [amenity] = await this.prisma.$transaction([
      this.prisma.amenity.update({ where: { id }, data: { name: to, category } }),
      this.prisma.$executeRaw`
        UPDATE "Hotel"
        SET "amenities" = array_replace("amenities", ${from}, ${to})
        WHERE ${from} = ANY("amenities")
      `,
      this.prisma.$executeRaw`
        UPDATE "Translation"
        SET "key" = ${amenityTranslationKey(to)}
        WHERE "key" = ${amenityTranslationKey(from)}
      `,
    ]);
    return amenity;
  }

  updateInPlace(id: string, name: string, category: string | null): Promise<Amenity> {
    return this.prisma.amenity.update({ where: { id }, data: { name, category } });
  }

  /**
   * Deletes the amenity, drops it from every hotel listing it, and removes its
   * translations — which would otherwise outlive it as unreachable rows.
   */
  async deleteCascade(id: string, name: string) {
    await this.prisma.$transaction([
      this.prisma.$executeRaw`
        UPDATE "Hotel"
        SET "amenities" = array_remove("amenities", ${name})
        WHERE ${name} = ANY("amenities")
      `,
      this.prisma.translation.deleteMany({ where: { key: amenityTranslationKey(name) } }),
      this.prisma.amenity.delete({ where: { id } }),
    ]);
  }

  upsertTranslation(key: string, locale: Locale, value: string) {
    return this.prisma.translation.upsert({
      where: { key_locale: { key, locale } },
      create: { key, locale, value },
      update: { value },
    });
  }

  deleteTranslation(key: string, locale: Locale) {
    return this.prisma.translation.deleteMany({ where: { key, locale } });
  }
}

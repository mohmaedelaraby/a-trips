import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Locale } from '../../generated/prisma/enums';
import { AmenitiesRepository } from './repositories/amenities.repository';
import { amenityTranslationKey, groupTranslationsByName } from './utils/amenity.util';
import type { AmenityDto } from './dto/amenity.dto';

@Injectable()
export class AmenitiesService {
  constructor(private readonly repository: AmenitiesRepository) {}

  /** Each amenity is returned with how many hotels currently list it. */
  async list() {
    const [amenities, hotels] = await Promise.all([
      this.repository.findAll(),
      this.repository.listHotelAmenities(),
    ]);

    const usage = new Map<string, number>();
    for (const hotel of hotels) {
      for (const name of hotel.amenities) {
        usage.set(name, (usage.get(name) ?? 0) + 1);
      }
    }

    const rows = await this.repository.findTranslations(amenities.map((a) => a.name));
    const byName = groupTranslationsByName(rows);

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
    const existing = await this.repository.findByName(name);
    if (existing) throw new BadRequestException('That amenity already exists');

    const amenity = await this.repository.create(name, dto.category?.trim() || null);
    await this.saveTranslations(name, dto.translations);
    return amenity;
  }

  async update(id: string, dto: AmenityDto) {
    const current = await this.assertExists(id);
    const name = dto.name.trim();
    const category = dto.category?.trim() || null;

    if (name !== current.name) {
      const clash = await this.repository.findByName(name);
      if (clash) throw new BadRequestException('Another amenity already has that name');
    }

    const amenity =
      name === current.name
        ? await this.repository.updateInPlace(id, name, category)
        : await this.repository.renameCascade(id, current.name, name, category);

    // After the rename, so this writes to the new key rather than the old one.
    await this.saveTranslations(name, dto.translations);

    return amenity;
  }

  async remove(id: string) {
    const current = await this.assertExists(id);
    await this.repository.deleteCascade(id, current.name);
    return { id, deleted: true };
  }

  /**
   * Writes an amenity's per-locale display text. A blank value clears the
   * override so the stored English shows through again.
   */
  private async saveTranslations(name: string, translations?: Record<string, string>) {
    if (!translations) return;
    const key = amenityTranslationKey(name);
    for (const [locale, raw] of Object.entries(translations)) {
      const value = (raw ?? '').trim();
      if (!value) {
        await this.repository.deleteTranslation(key, locale as Locale);
        continue;
      }
      await this.repository.upsertTranslation(key, locale as Locale, value);
    }
  }

  private async assertExists(id: string) {
    const amenity = await this.repository.findById(id);
    if (!amenity) throw new NotFoundException('Amenity not found');
    return amenity;
  }
}

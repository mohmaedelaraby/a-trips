import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { HotelStatus, Locale } from '../../generated/prisma/enums';
import { AvailabilityService } from '../availability/availability.service';
import { buildMeta, resolvePagination } from '../../common/utils/pagination.util';
import { slugify } from '../../common/utils/slug.util';
import { toNumber } from '../../common/utils/decimal.util';
import { countNights, parseDateOnly } from '../../common/utils/date.util';
import { HotelsRepository } from './repositories/hotels.repository';
import {
  hotelKeyPrefix,
  nestTranslations,
  roomTypeKeyPrefix,
  toHotelDto,
  toRoomTypeDto,
} from './utils/hotel-mapper.util';
import {
  assertDateRange,
  buildAdminHotelWhere,
  buildFacets,
  buildGuestFilter,
  buildSearchWhere,
  sortHotels,
} from './utils/hotel-search.util';
import type { HotelDetailQueryDto, HotelSearchDto } from './dto/hotel-search.dto';
import type {
  AddHotelImagesDto,
  AdminHotelListDto,
  CreateHotelDto,
  UpdateHotelDto,
} from './dto/hotel.dto';

export { amenityLabel } from './utils/hotel-mapper.util';

@Injectable()
export class HotelsService {
  constructor(
    private readonly repository: HotelsRepository,
    private readonly availability: AvailabilityService,
  ) {}

  // ---------------------------------------------------------------- public

  async search(query: HotelSearchDto, t?: Record<string, string>) {
    const { page, pageSize, skip, take } = resolvePagination(query);
    assertDateRange(query.checkIn, query.checkOut);

    const guestFilter = buildGuestFilter(query);
    const candidates = await this.repository.findSearchCandidates(
      buildSearchWhere(query, guestFilter),
      guestFilter,
    );

    const hasDates = Boolean(query.checkIn && query.checkOut);
    const assessments = hasDates
      ? await this.availability.assessManyRoomTypes(
          candidates.flatMap((hotel) => hotel.roomTypes.map((rt) => rt.id)),
          query.checkIn as string,
          query.checkOut as string,
        )
      : null;

    const nights =
      hasDates && query.checkIn && query.checkOut
        ? countNights(parseDateOnly(query.checkIn), parseDateOnly(query.checkOut))
        : 1;

    let items = candidates.map((hotel) => {
      let fromPrice: number | null = null;

      if (assessments) {
        // With dates, only genuinely bookable room types set the "from" price.
        for (const roomType of hotel.roomTypes) {
          const assessment = assessments.get(roomType.id);
          if (!assessment?.bookable || assessment.totalPrice === null) continue;
          const nightly = assessment.totalPrice / assessment.nights;
          fromPrice = fromPrice === null ? nightly : Math.min(fromPrice, nightly);
        }
      } else {
        for (const roomType of hotel.roomTypes) {
          const price = toNumber(roomType.basePrice);
          fromPrice = fromPrice === null ? price : Math.min(fromPrice, price);
        }
      }

      return {
        ...toHotelDto(hotel, t),
        fromPrice: fromPrice === null ? null : Math.round(fromPrice * 100) / 100,
        roomTypeCount: hotel.roomTypes.length,
        nights,
      };
    });

    // A hotel with no bookable room type for the requested dates is not a result.
    if (assessments) items = items.filter((item) => item.fromPrice !== null);

    // Before the price filter, so narrowing the slider does not empty out the
    // other facets and strand the user with no way back.
    const facets = buildFacets(items, t);

    if (query.minPrice !== undefined) {
      items = items.filter((i) => i.fromPrice === null || i.fromPrice >= (query.minPrice as number));
    }
    if (query.maxPrice !== undefined) {
      items = items.filter((i) => i.fromPrice === null || i.fromPrice <= (query.maxPrice as number));
    }

    items = sortHotels(items, query.sort ?? 'recommended');
    const total = items.length;

    return {
      items: items.slice(skip, skip + take),
      meta: buildMeta(page, pageSize, total),
      facets,
    };
  }

  /** Resolves a public id-or-slug to the hotel id, or 404s. */
  async resolvePublishedId(idOrSlug: string): Promise<string> {
    const hotel = await this.repository.findPublishedId(idOrSlug);
    if (!hotel) throw new NotFoundException('Hotel not found');
    return hotel.id;
  }

  async findPublicByIdOrSlug(
    idOrSlug: string,
    query: HotelDetailQueryDto,
    t?: Record<string, string>,
  ) {
    assertDateRange(query.checkIn, query.checkOut);

    const hotel = await this.repository.findPublicDetail(idOrSlug);
    if (!hotel) throw new NotFoundException('Hotel not found');

    const hasDates = Boolean(query.checkIn && query.checkOut);
    const assessments = hasDates
      ? await this.availability.assessManyRoomTypes(
          hotel.roomTypes.map((rt) => rt.id),
          query.checkIn as string,
          query.checkOut as string,
        )
      : null;

    return {
      ...toHotelDto(hotel, t),
      roomTypes: hotel.roomTypes.map((roomType) => {
        const dto = toRoomTypeDto(roomType, t);
        if (!assessments) return dto;

        const assessment = assessments.get(roomType.id);
        const fitsParty =
          (!query.adults || roomType.capacityAdults >= query.adults) &&
          (!query.children || roomType.capacityChildren >= query.children);

        return {
          ...dto,
          availability: {
            checkIn: query.checkIn as string,
            checkOut: query.checkOut as string,
            nights: assessment?.nights ?? 0,
            bookable: Boolean(assessment?.bookable) && fitsParty,
            minUnitsAvailable: assessment?.minUnitsAvailable ?? 0,
            totalPrice: assessment?.totalPrice ?? null,
            averageNightlyPrice:
              assessment && assessment.totalPrice !== null && assessment.nights > 0
                ? Math.round((assessment.totalPrice / assessment.nights) * 100) / 100
                : null,
            // Too small for the party is a different answer from sold out, and
            // the guest can act on it by changing the party size.
            ...(!fitsParty
              ? { reason: 'CAPACITY' as const }
              : assessment?.bookable
                ? {}
                : { reason: 'SOLD_OUT' as const }),
          },
        };
      }),
    };
  }

  async listCities() {
    const rows = await this.repository.groupCities();
    return rows.map((row) => ({ value: row.city, count: row._count._all }));
  }

  // ----------------------------------------------------------------- admin

  async adminList(query: AdminHotelListDto) {
    const { page, pageSize, skip, take } = resolvePagination(query);
    const [rows, total] = await this.repository.findAdminPage(
      buildAdminHotelWhere(query),
      skip,
      take,
    );

    return {
      items: rows.map((hotel) => ({
        ...toHotelDto(hotel),
        roomTypeCount: hotel.roomTypes.length,
        fromPrice: hotel.roomTypes.length ? toNumber(hotel.roomTypes[0].basePrice) : null,
      })),
      meta: buildMeta(page, pageSize, total),
    };
  }

  /**
   * Admin view of a hotel: the stored English alongside its translations, so
   * the editor can show both languages side by side.
   */
  async adminFindOne(id: string) {
    const hotel = await this.repository.findByIdWithRelations(id);
    if (!hotel) throw new NotFoundException('Hotel not found');

    const rows = await this.repository.findTranslations(
      id,
      hotel.roomTypes.map((rt) => rt.id),
    );

    return {
      ...toHotelDto(hotel),
      translations: nestTranslations(rows, hotelKeyPrefix(id)),
      roomTypes: hotel.roomTypes.map((rt) => ({
        ...toRoomTypeDto(rt),
        translations: nestTranslations(rows, roomTypeKeyPrefix(rt.id)),
      })),
    };
  }

  async create(dto: CreateHotelDto, adminId: string) {
    const slug = await this.uniqueSlug(`${dto.name} ${dto.city}`);
    const hotel = await this.repository.create({
      slug,
      name: dto.name.trim(),
      city: dto.city.trim(),
      address: dto.address.trim(),
      country: dto.country.trim(),
      description: dto.description?.trim() || null,
      stars: dto.stars,
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      amenities: dto.amenities ?? [],
      status: dto.status ?? HotelStatus.DRAFT,
      createdBy: adminId,
      images: dto.images?.length
        ? {
            create: dto.images.map((image, index) => ({
              url: image.url,
              sortOrder: image.sortOrder ?? index,
              isPrimary: image.isPrimary ?? index === 0,
            })),
          }
        : undefined,
    });
    return toHotelDto(hotel);
  }

  async update(id: string, dto: UpdateHotelDto) {
    const current = await this.assertExists(id);

    // A slug is a public URL. Changing it keeps the old one working: it moves
    // into previousSlugs, which the lookup also matches, so links already
    // shared or indexed still resolve instead of 404ing.
    let slugChange: { slug: string; previousSlugs: string[] } | null = null;
    if (dto.slug !== undefined) {
      const next = await this.resolveSlugChange(current, dto.slug);
      if (next) slugChange = next;
    }

    const hotel = await this.repository.update(id, {
      ...(slugChange ?? {}),
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.city !== undefined ? { city: dto.city.trim() } : {}),
      ...(dto.address !== undefined ? { address: dto.address.trim() } : {}),
      ...(dto.country !== undefined ? { country: dto.country.trim() } : {}),
      ...(dto.description !== undefined ? { description: dto.description.trim() || null } : {}),
      ...(dto.stars !== undefined ? { stars: dto.stars } : {}),
      ...(dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
      ...(dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
      ...(dto.amenities !== undefined ? { amenities: dto.amenities } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
    });

    // After the row, so a rejected hotel update never leaves orphaned copy.
    await this.saveTranslations(hotelKeyPrefix(id), dto.translations);

    return toHotelDto(hotel);
  }

  async addImages(hotelId: string, dto: AddHotelImagesDto) {
    await this.assertExists(hotelId);
    const existing = await this.repository.countImages(hotelId);
    await this.repository.createImages(
      dto.images.map((image, index) => ({
        hotelId,
        url: image.url,
        sortOrder: image.sortOrder ?? existing + index,
        isPrimary: image.isPrimary ?? (existing === 0 && index === 0),
      })),
    );
    return this.adminFindOne(hotelId);
  }

  /** Persists gallery order; the first id becomes the card thumbnail. */
  async reorderImages(hotelId: string, imageIds: string[]) {
    await this.assertExists(hotelId);
    const existing = await this.repository.findImageIds(hotelId);
    const known = new Set(existing.map((image) => image.id));
    if (imageIds.length !== known.size || imageIds.some((id) => !known.has(id))) {
      throw new BadRequestException('Image order must list every image of this hotel exactly once');
    }

    await this.repository.applyImageOrder(imageIds);
    return this.adminFindOne(hotelId);
  }

  /** Used before deletion so the stored object can be cleaned up too. */
  async findImageUrl(hotelId: string, imageId: string): Promise<string | null> {
    const image = await this.repository.findImageUrl(hotelId, imageId);
    return image?.url ?? null;
  }

  async removeImage(hotelId: string, imageId: string) {
    const image = await this.repository.findImage(hotelId, imageId);
    if (!image) throw new NotFoundException('Image not found');
    await this.repository.deleteImage(imageId);
    return this.adminFindOne(hotelId);
  }

  /**
   * Retires a hotel.
   *
   * Deleted outright only when nothing references it. A hotel with bookings is
   * archived instead — hidden from the site but kept on record, because those
   * reservations belong to real guests and cascading them away would erase
   * their history. Mirrors how room types deactivate rather than delete.
   */
  async remove(id: string) {
    await this.assertExists(id);

    const bookings = await this.repository.countBookings(id);
    if (bookings > 0) {
      const hotel = await this.repository.update(id, { status: HotelStatus.ARCHIVED });
      return { id, deleted: false, archived: true, bookings, hotel: toHotelDto(hotel) };
    }

    await this.repository.delete(id);
    return { id, deleted: true, archived: false, bookings: 0 };
  }

  // --------------------------------------------------------------- helpers

  /**
   * Replaces the translations for one entity. An empty value deletes the row so
   * the English falls through again, which is how a translation is "removed".
   */
  private async saveTranslations(
    keyPrefix: string,
    translations: Record<string, Record<string, string>> | undefined,
  ) {
    if (!translations) return;
    for (const [locale, fields] of Object.entries(translations)) {
      for (const [field, raw] of Object.entries(fields)) {
        const key = `${keyPrefix}${field}`;
        const value = (raw ?? '').trim();
        if (!value) {
          await this.repository.deleteTranslation(key, locale as Locale);
          continue;
        }
        await this.repository.upsertTranslation(key, locale as Locale, value);
      }
    }
  }

  private async assertExists(id: string) {
    const hotel = await this.repository.findIdentity(id);
    if (!hotel) throw new NotFoundException('Hotel not found');
    return hotel;
  }

  private async uniqueSlug(source: string) {
    const base = slugify(source) || 'hotel';
    let candidate = base;
    let suffix = 2;
    // Slugs are the public URL key, so collisions get a numeric suffix.
    while (await this.repository.slugTaken(candidate)) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }

  /**
   * Validates a requested slug and works out the new previousSlugs list.
   * Returns null when the slug is unchanged, so the update touches nothing.
   */
  private async resolveSlugChange(
    current: { id: string; slug: string; previousSlugs: string[] },
    requested: string,
  ): Promise<{ slug: string; previousSlugs: string[] } | null> {
    const next = slugify(requested);
    if (!next) {
      throw new BadRequestException('Slug must contain at least one letter or number');
    }
    if (next === current.slug) return null;

    const clash = await this.repository.findSlugClash(current.id, next);
    if (clash) {
      throw new BadRequestException('Another hotel already uses that link, including its old links');
    }

    // The outgoing slug joins the history; the incoming one leaves it, so a
    // slug reverted to an earlier value is not both current and historical.
    const history = current.previousSlugs.filter((slug) => slug !== next);
    return { slug: next, previousSlugs: [...new Set([...history, current.slug])] };
  }
}

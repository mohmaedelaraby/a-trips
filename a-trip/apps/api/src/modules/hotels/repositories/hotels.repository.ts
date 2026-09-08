import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '../../../generated/prisma/client';
import { HotelStatus, Locale, RoomTypeStatus } from '../../../generated/prisma/enums';
import { hotelInclude, hotelKeyPrefix, isUuid, roomTypeKeyPrefix } from '../utils/hotel-mapper.util';

/**
 * Matches a public id-or-slug, including retired slugs.
 *
 * Renamed hotels keep answering to their old links, so a URL already shared or
 * indexed resolves instead of 404ing.
 */
function publicLookup(idOrSlug: string): Prisma.HotelWhereInput {
  return {
    status: HotelStatus.PUBLISHED,
    OR: [
      { slug: idOrSlug },
      { previousSlugs: { has: idOrSlug } },
      ...(isUuid(idOrSlug) ? [{ id: idOrSlug }] : []),
    ],
  };
}

@Injectable()
export class HotelsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Search candidates with their matching room types.
   *
   * Unpaginated on purpose for now: price and availability are computed per
   * hotel after the query, and sorting on a derived value cannot be pushed into
   * SQL without materialising it first. Worth revisiting as the catalogue grows.
   */
  findSearchCandidates(where: Prisma.HotelWhereInput, guestFilter: Prisma.RoomTypeWhereInput) {
    return this.prisma.hotel.findMany({
      where,
      include: {
        images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
        roomTypes: { where: guestFilter, orderBy: { basePrice: 'asc' } },
      },
    });
  }

  findPublishedId(idOrSlug: string) {
    return this.prisma.hotel.findFirst({ where: publicLookup(idOrSlug), select: { id: true } });
  }

  /** Public detail: active room types only — a retired room is not on sale. */
  findPublicDetail(idOrSlug: string) {
    return this.prisma.hotel.findFirst({
      where: publicLookup(idOrSlug),
      include: {
        images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
        roomTypes: { where: { status: RoomTypeStatus.ACTIVE }, orderBy: { basePrice: 'asc' } },
      },
    });
  }

  groupCities() {
    return this.prisma.hotel.groupBy({
      by: ['city'],
      where: { status: HotelStatus.PUBLISHED },
      _count: { _all: true },
      orderBy: { _count: { id: 'desc' } },
    });
  }

  findAdminPage(where: Prisma.HotelWhereInput, skip: number, take: number) {
    return Promise.all([
      this.prisma.hotel.findMany({
        where,
        include: hotelInclude,
        orderBy: { updatedAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.hotel.count({ where }),
    ]);
  }

  findByIdWithRelations(id: string) {
    return this.prisma.hotel.findUnique({ where: { id }, include: hotelInclude });
  }

  /**
   * The last date this hotel has any inventory loaded for.
   *
   * Past dates are excluded deliberately: a hotel whose calendar stopped last
   * month has nothing on sale, and reporting that stale date as "availability
   * set to ..." would read as healthy when the hotel is invisible to guests.
   */
  async findAvailabilityEnd(hotelId: string, from: Date): Promise<Date | null> {
    const result = await this.prisma.roomAvailability.aggregate({
      _max: { date: true },
      where: { roomType: { hotelId }, date: { gte: from } },
    });
    return result._max.date;
  }

  findIdentity(id: string) {
    return this.prisma.hotel.findUnique({
      where: { id },
      select: { id: true, slug: true, previousSlugs: true },
    });
  }

  /** Every translation belonging to a hotel and its room types, in one query. */
  findTranslations(hotelId: string, roomTypeIds: string[]) {
    return this.prisma.translation.findMany({
      where: {
        OR: [
          { key: { startsWith: hotelKeyPrefix(hotelId) } },
          ...roomTypeIds.map((id) => ({ key: { startsWith: roomTypeKeyPrefix(id) } })),
        ],
      },
      select: { key: true, locale: true, value: true },
    });
  }

  create(data: Prisma.HotelUncheckedCreateInput) {
    return this.prisma.hotel.create({ data, include: hotelInclude });
  }

  update(id: string, data: Prisma.HotelUpdateInput) {
    return this.prisma.hotel.update({ where: { id }, data, include: hotelInclude });
  }

  delete(id: string) {
    // Room types, availability and images cascade from the schema.
    return this.prisma.hotel.delete({ where: { id } });
  }

  countBookings(hotelId: string) {
    return this.prisma.booking.count({ where: { hotelId } });
  }

  slugTaken(slug: string) {
    return this.prisma.hotel.findUnique({ where: { slug }, select: { id: true } });
  }

  /** A slug clashes if any *other* hotel uses it now or used it before. */
  findSlugClash(excludeHotelId: string, slug: string) {
    return this.prisma.hotel.findFirst({
      where: {
        id: { not: excludeHotelId },
        OR: [{ slug }, { previousSlugs: { has: slug } }],
      },
      select: { id: true },
    });
  }

  // ---------------------------------------------------------------- images

  countImages(hotelId: string) {
    return this.prisma.hotelImage.count({ where: { hotelId } });
  }

  createImages(data: Prisma.HotelImageCreateManyInput[]) {
    return this.prisma.hotelImage.createMany({ data });
  }

  findImageIds(hotelId: string) {
    return this.prisma.hotelImage.findMany({ where: { hotelId }, select: { id: true } });
  }

  findImage(hotelId: string, imageId: string) {
    return this.prisma.hotelImage.findFirst({ where: { id: imageId, hotelId } });
  }

  findImageUrl(hotelId: string, imageId: string) {
    return this.prisma.hotelImage.findFirst({
      where: { id: imageId, hotelId },
      select: { url: true },
    });
  }

  deleteImage(imageId: string) {
    return this.prisma.hotelImage.delete({ where: { id: imageId } });
  }

  /** One transaction so the gallery is never half-reordered. */
  applyImageOrder(imageIds: string[]) {
    return this.prisma.$transaction(
      imageIds.map((id, index) =>
        this.prisma.hotelImage.update({
          where: { id },
          data: { sortOrder: index, isPrimary: index === 0 },
        }),
      ),
    );
  }

  // ---------------------------------------------------------- translations

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

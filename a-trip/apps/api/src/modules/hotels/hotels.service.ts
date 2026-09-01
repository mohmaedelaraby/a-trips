import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { HotelStatus, RoomTypeStatus } from '../../generated/prisma/enums';
import { AvailabilityService } from '../availability/availability.service';
import { buildMeta, resolvePagination } from '../../common/utils/pagination.util';
import { slugify } from '../../common/utils/slug.util';
import { toNullableNumber, toNumber } from '../../common/utils/decimal.util';
import { countNights, parseDateOnly } from '../../common/utils/date.util';
import type { HotelDetailQueryDto, HotelSearchDto } from './dto/hotel-search.dto';
import type {
  AddHotelImagesDto,
  AdminHotelListDto,
  CreateHotelDto,
  UpdateHotelDto,
} from './dto/hotel.dto';

const hotelInclude = {
  images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
  roomTypes: { orderBy: { basePrice: 'asc' } },
} satisfies Prisma.HotelInclude;

type HotelWithImages = Prisma.HotelGetPayload<{ include: { images: true } }>;

@Injectable()
export class HotelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: AvailabilityService,
  ) {}

  // ---------------------------------------------------------------- public

  async search(query: HotelSearchDto) {
    const { page, pageSize, skip, take } = resolvePagination(query);
    this.assertDateRange(query.checkIn, query.checkOut);

    const where: Prisma.HotelWhereInput = { status: HotelStatus.PUBLISHED };
    if (query.city) where.city = { equals: query.city, mode: 'insensitive' };
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { city: { contains: query.q, mode: 'insensitive' } },
        { country: { contains: query.q, mode: 'insensitive' } },
        { address: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    if (query.stars?.length) where.stars = { in: query.stars };
    if (query.amenities?.length) where.amenities = { hasEvery: query.amenities };

    // Capacity is a room-level constraint: keep hotels that have at least one
    // room type big enough for the party.
    const guestFilter: Prisma.RoomTypeWhereInput = { status: RoomTypeStatus.ACTIVE };
    if (query.adults) guestFilter.capacityAdults = { gte: query.adults };
    if (query.children) guestFilter.capacityChildren = { gte: query.children };
    where.roomTypes = { some: guestFilter };

    const candidates = await this.prisma.hotel.findMany({
      where,
      include: {
        images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
        roomTypes: { where: guestFilter, orderBy: { basePrice: 'asc' } },
      },
    });

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
        ...this.toHotelDto(hotel),
        fromPrice: fromPrice === null ? null : Math.round(fromPrice * 100) / 100,
        roomTypeCount: hotel.roomTypes.length,
        nights,
      };
    });

    // A hotel with no bookable room type for the requested dates is not a result.
    if (assessments) items = items.filter((item) => item.fromPrice !== null);

    const facets = this.buildFacets(items);

    if (query.minPrice !== undefined) {
      items = items.filter((i) => i.fromPrice === null || i.fromPrice >= (query.minPrice as number));
    }
    if (query.maxPrice !== undefined) {
      items = items.filter((i) => i.fromPrice === null || i.fromPrice <= (query.maxPrice as number));
    }

    items = this.sortHotels(items, query.sort ?? 'recommended');
    const total = items.length;

    return {
      items: items.slice(skip, skip + take),
      meta: buildMeta(page, pageSize, total),
      facets,
    };
  }

  async findPublicByIdOrSlug(idOrSlug: string, query: HotelDetailQueryDto) {
    this.assertDateRange(query.checkIn, query.checkOut);

    const hotel = await this.prisma.hotel.findFirst({
      where: {
        status: HotelStatus.PUBLISHED,
        OR: [{ slug: idOrSlug }, ...(isUuid(idOrSlug) ? [{ id: idOrSlug }] : [])],
      },
      include: {
        images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
        roomTypes: { where: { status: RoomTypeStatus.ACTIVE }, orderBy: { basePrice: 'asc' } },
      },
    });
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
      ...this.toHotelDto(hotel),
      roomTypes: hotel.roomTypes.map((roomType) => {
        const dto = this.toRoomTypeDto(roomType);
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
    const rows = await this.prisma.hotel.groupBy({
      by: ['city'],
      where: { status: HotelStatus.PUBLISHED },
      _count: { _all: true },
      orderBy: { _count: { id: 'desc' } },
    });
    return rows.map((row) => ({ value: row.city, count: row._count._all }));
  }

  // ----------------------------------------------------------------- admin

  async adminList(query: AdminHotelListDto) {
    const { page, pageSize, skip, take } = resolvePagination(query);
    const where: Prisma.HotelWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.city) where.city = { equals: query.city, mode: 'insensitive' };
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { city: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.hotel.findMany({
        where,
        include: {
          images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
          roomTypes: { orderBy: { basePrice: 'asc' } },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.hotel.count({ where }),
    ]);

    return {
      items: rows.map((hotel) => ({
        ...this.toHotelDto(hotel),
        roomTypeCount: hotel.roomTypes.length,
        fromPrice: hotel.roomTypes.length ? toNumber(hotel.roomTypes[0].basePrice) : null,
      })),
      meta: buildMeta(page, pageSize, total),
    };
  }

  async adminFindOne(id: string) {
    const hotel = await this.prisma.hotel.findUnique({ where: { id }, include: hotelInclude });
    if (!hotel) throw new NotFoundException('Hotel not found');
    return {
      ...this.toHotelDto(hotel),
      roomTypes: hotel.roomTypes.map((rt) => this.toRoomTypeDto(rt)),
    };
  }

  async create(dto: CreateHotelDto, adminId: string) {
    const slug = await this.uniqueSlug(`${dto.name} ${dto.city}`);
    const hotel = await this.prisma.hotel.create({
      data: {
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
      },
      include: hotelInclude,
    });
    return this.toHotelDto(hotel);
  }

  async update(id: string, dto: UpdateHotelDto) {
    await this.assertExists(id);
    const hotel = await this.prisma.hotel.update({
      where: { id },
      data: {
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
      },
      include: hotelInclude,
    });
    return this.toHotelDto(hotel);
  }

  async addImages(hotelId: string, dto: AddHotelImagesDto) {
    await this.assertExists(hotelId);
    const existing = await this.prisma.hotelImage.count({ where: { hotelId } });
    await this.prisma.hotelImage.createMany({
      data: dto.images.map((image, index) => ({
        hotelId,
        url: image.url,
        sortOrder: image.sortOrder ?? existing + index,
        isPrimary: image.isPrimary ?? (existing === 0 && index === 0),
      })),
    });
    return this.adminFindOne(hotelId);
  }

  /** Persists gallery order; the first id becomes the card thumbnail. */
  async reorderImages(hotelId: string, imageIds: string[]) {
    await this.assertExists(hotelId);
    const existing = await this.prisma.hotelImage.findMany({
      where: { hotelId },
      select: { id: true },
    });
    const known = new Set(existing.map((image) => image.id));
    if (imageIds.length !== known.size || imageIds.some((id) => !known.has(id))) {
      throw new BadRequestException('Image order must list every image of this hotel exactly once');
    }

    await this.prisma.$transaction(
      imageIds.map((id, index) =>
        this.prisma.hotelImage.update({
          where: { id },
          data: { sortOrder: index, isPrimary: index === 0 },
        }),
      ),
    );
    return this.adminFindOne(hotelId);
  }

  /** Used before deletion so the stored object can be cleaned up too. */
  async findImageUrl(hotelId: string, imageId: string): Promise<string | null> {
    const image = await this.prisma.hotelImage.findFirst({
      where: { id: imageId, hotelId },
      select: { url: true },
    });
    return image?.url ?? null;
  }

  async removeImage(hotelId: string, imageId: string) {
    const image = await this.prisma.hotelImage.findFirst({ where: { id: imageId, hotelId } });
    if (!image) throw new NotFoundException('Image not found');
    await this.prisma.hotelImage.delete({ where: { id: imageId } });
    return this.adminFindOne(hotelId);
  }

  // --------------------------------------------------------------- helpers

  private assertDateRange(checkIn?: string, checkOut?: string) {
    if (!checkIn && !checkOut) return;
    if (!checkIn || !checkOut) {
      throw new BadRequestException('Provide both checkIn and checkOut, or neither');
    }
    if (countNights(parseDateOnly(checkIn), parseDateOnly(checkOut)) < 1) {
      throw new BadRequestException('Check-out must be at least one night after check-in');
    }
  }

  private sortHotels<T extends { fromPrice: number | null; stars: number; name: string }>(
    items: T[],
    sort: string,
  ): T[] {
    const byPrice = (a: T, b: T, dir: number) => {
      if (a.fromPrice === null) return 1;
      if (b.fromPrice === null) return -1;
      return (a.fromPrice - b.fromPrice) * dir;
    };
    const sorted = [...items];
    switch (sort) {
      case 'price_asc':
        return sorted.sort((a, b) => byPrice(a, b, 1));
      case 'price_desc':
        return sorted.sort((a, b) => byPrice(a, b, -1));
      case 'stars_desc':
        return sorted.sort((a, b) => b.stars - a.stars || byPrice(a, b, 1));
      case 'name_asc':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      default:
        // Recommended: highest rated first, cheapest as the tie-break.
        return sorted.sort((a, b) => b.stars - a.stars || byPrice(a, b, 1));
    }
  }

  private buildFacets(items: Array<{ city: string; amenities: string[]; stars: number; fromPrice: number | null }>) {
    const cities = new Map<string, number>();
    const amenities = new Map<string, number>();
    const stars = new Map<number, number>();
    let min: number | null = null;
    let max: number | null = null;

    for (const item of items) {
      cities.set(item.city, (cities.get(item.city) ?? 0) + 1);
      stars.set(item.stars, (stars.get(item.stars) ?? 0) + 1);
      for (const amenity of item.amenities) {
        amenities.set(amenity, (amenities.get(amenity) ?? 0) + 1);
      }
      if (item.fromPrice !== null) {
        min = min === null ? item.fromPrice : Math.min(min, item.fromPrice);
        max = max === null ? item.fromPrice : Math.max(max, item.fromPrice);
      }
    }

    const toSorted = <K extends string | number>(map: Map<K, number>) =>
      [...map.entries()]
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count || String(a.value).localeCompare(String(b.value)));

    return {
      cities: toSorted(cities),
      amenities: toSorted(amenities),
      stars: [...stars.entries()]
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.value - a.value),
      priceRange: min === null || max === null ? null : { min, max },
    };
  }

  private toHotelDto(hotel: HotelWithImages) {
    return {
      id: hotel.id,
      slug: hotel.slug,
      name: hotel.name,
      city: hotel.city,
      address: hotel.address,
      country: hotel.country,
      description: hotel.description,
      stars: hotel.stars,
      latitude: hotel.latitude,
      longitude: hotel.longitude,
      amenities: hotel.amenities,
      status: hotel.status,
      images: hotel.images.map((image) => ({
        id: image.id,
        url: image.url,
        sortOrder: image.sortOrder,
        isPrimary: image.isPrimary,
      })),
      createdAt: hotel.createdAt,
      updatedAt: hotel.updatedAt,
    };
  }

  private toRoomTypeDto(roomType: Prisma.RoomTypeGetPayload<object>) {
    return {
      id: roomType.id,
      hotelId: roomType.hotelId,
      name: roomType.name,
      description: roomType.description,
      capacityAdults: roomType.capacityAdults,
      capacityChildren: roomType.capacityChildren,
      numOfBeds: roomType.numOfBeds,
      sizeSqm: toNullableNumber(roomType.sizeSqm),
      basePrice: toNumber(roomType.basePrice),
      status: roomType.status,
    };
  }

  private async assertExists(id: string) {
    const hotel = await this.prisma.hotel.findUnique({ where: { id }, select: { id: true } });
    if (!hotel) throw new NotFoundException('Hotel not found');
  }

  private async uniqueSlug(source: string) {
    const base = slugify(source) || 'hotel';
    let candidate = base;
    let suffix = 2;
    // Slugs are the public URL key, so collisions get a numeric suffix.
    while (await this.prisma.hotel.findUnique({ where: { slug: candidate }, select: { id: true } })) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

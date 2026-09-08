import { BadRequestException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { HotelStatus, RoomTypeStatus } from '../../../generated/prisma/enums';
import { countNights, parseDateOnly } from '../../../common/utils/date.util';
import { amenityLabel } from './hotel-mapper.util';
import type { AdminHotelListDto } from '../dto/hotel.dto';
import type { HotelSearchDto } from '../dto/hotel-search.dto';

/** Dates are optional, but half a range is a client bug, not a broad search. */
export function assertDateRange(checkIn?: string, checkOut?: string): void {
  if (!checkIn && !checkOut) return;
  if (!checkIn || !checkOut) {
    throw new BadRequestException('Provide both checkIn and checkOut, or neither');
  }
  if (countNights(parseDateOnly(checkIn), parseDateOnly(checkOut)) < 1) {
    throw new BadRequestException('Check-out must be at least one night after check-in');
  }
}

/**
 * Room-level constraint for the party size.
 *
 * Capacity lives on the room type, so this is both the `some` filter that keeps
 * a hotel in the results and the filter applied to the rooms loaded with it —
 * the same predicate, used twice on purpose.
 */
export function buildGuestFilter(query: HotelSearchDto): Prisma.RoomTypeWhereInput {
  const guestFilter: Prisma.RoomTypeWhereInput = { status: RoomTypeStatus.ACTIVE };
  if (query.adults) guestFilter.capacityAdults = { gte: query.adults };
  if (query.children) guestFilter.capacityChildren = { gte: query.children };
  return guestFilter;
}

export function buildSearchWhere(
  query: HotelSearchDto,
  guestFilter: Prisma.RoomTypeWhereInput,
): Prisma.HotelWhereInput {
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
  // hasEvery, not hasSome: ticking two amenities means "both", the way every
  // booking site behaves.
  if (query.amenities?.length) where.amenities = { hasEvery: query.amenities };

  where.roomTypes = { some: guestFilter };
  return where;
}

export function buildAdminHotelWhere(query: AdminHotelListDto): Prisma.HotelWhereInput {
  const where: Prisma.HotelWhereInput = {};
  if (query.status) where.status = query.status;
  if (query.city) where.city = { equals: query.city, mode: 'insensitive' };
  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: 'insensitive' } },
      { city: { contains: query.q, mode: 'insensitive' } },
    ];
  }
  return where;
}

/**
 * Orders results.
 *
 * Nulls always sink regardless of direction: a hotel with no price is the least
 * useful result either way, so it never leads a price-sorted list.
 */
export function sortHotels<T extends { fromPrice: number | null; stars: number; name: string }>(
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

export interface FacetInput {
  city: string;
  amenities: string[];
  stars: number;
  fromPrice: number | null;
}

/**
 * Counts for the filter sidebar.
 *
 * Built from the results *before* the price filter is applied, so moving the
 * price slider does not empty out the other facets and strand the user with no
 * way back.
 */
export function buildFacets(items: FacetInput[], t?: Record<string, string>) {
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
    // Amenity facets carry a separate label: the checkbox shows the label but
    // submits the value, so filtering keeps working in any language.
    amenities: toSorted(amenities).map((facet) => ({
      ...facet,
      label: amenityLabel(facet.value, t),
    })),
    stars: [...stars.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.value - a.value),
    priceRange: min === null || max === null ? null : { min, max },
  };
}

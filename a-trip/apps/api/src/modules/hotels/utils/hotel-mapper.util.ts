import { Prisma } from '../../../generated/prisma/client';
import { toNullableNumber, toNumber } from '../../../common/utils/decimal.util';

export const hotelInclude = {
  images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
  roomTypes: { orderBy: { basePrice: 'asc' } },
} satisfies Prisma.HotelInclude;

export type HotelWithImages = Prisma.HotelGetPayload<{ include: { images: true } }>;
export type RoomTypeRow = Prisma.RoomTypeGetPayload<object>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A public lookup accepts a slug or an id. Testing the shape first keeps a slug
 * like "nile-view" from being sent to the database as a uuid comparison.
 */
export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function hotelKeyPrefix(hotelId: string): string {
  return `hotel.${hotelId}.`;
}

export function roomTypeKeyPrefix(roomTypeId: string): string {
  return `roomType.${roomTypeId}.`;
}

/**
 * Localised display text for an amenity.
 *
 * Keyed by the amenity's own name rather than its catalogue id, so rendering a
 * hotel needs no extra query — the name is already in `Hotel.amenities`, and
 * search loads the whole catalogue, where one lookup per hotel would add up.
 * AmenitiesService keeps these keys in step when an amenity is renamed.
 */
export function amenityLabel(name: string, t?: Record<string, string>): string {
  return t?.[`amenity.${name}`] || name;
}

/**
 * `t` carries the translation overrides for the requested locale. Admin
 * responses pass nothing and get the stored wording, which is what an editor
 * needs to see; public responses pass a map and get localised text.
 */
export function toHotelDto(hotel: HotelWithImages, t?: Record<string, string>) {
  const prefix = hotelKeyPrefix(hotel.id);
  const tr = (field: string, fallback: string) => (t ? t[`${prefix}${field}`] || fallback : fallback);

  return {
    id: hotel.id,
    slug: hotel.slug,
    name: tr('name', hotel.name),
    city: tr('city', hotel.city),
    address: tr('address', hotel.address),
    country: tr('country', hotel.country),
    description: tr('description', hotel.description ?? '') || null,
    stars: hotel.stars,
    latitude: hotel.latitude,
    longitude: hotel.longitude,
    // Stays the stored English: this array is the filter key, and
    // `?amenities=` is matched against it with hasEvery. Translating in place
    // would make the Arabic site send Arabic back and match nothing.
    amenities: hotel.amenities,
    /** Display text for each amenity above — value stays the key. */
    amenityLabels: Object.fromEntries(hotel.amenities.map((name) => [name, amenityLabel(name, t)])),
    status: hotel.status,
    images: hotel.images.map((image) => ({
      id: image.id,
      url: image.url,
      sortOrder: image.sortOrder,
      isPrimary: image.isPrimary,
    })),
    /** Links this hotel still answers to after a slug change. */
    previousSlugs: hotel.previousSlugs,
    createdBy: hotel.createdBy,
    createdAt: hotel.createdAt,
    updatedAt: hotel.updatedAt,
  };
}

export function toRoomTypeDto(roomType: RoomTypeRow, t?: Record<string, string>) {
  const prefix = roomTypeKeyPrefix(roomType.id);
  const tr = (field: string, fallback: string) => (t ? t[`${prefix}${field}`] || fallback : fallback);

  return {
    id: roomType.id,
    hotelId: roomType.hotelId,
    name: tr('name', roomType.name),
    description: tr('description', roomType.description ?? '') || null,
    capacityAdults: roomType.capacityAdults,
    capacityChildren: roomType.capacityChildren,
    numOfBeds: roomType.numOfBeds,
    sizeSqm: toNullableNumber(roomType.sizeSqm),
    basePrice: toNumber(roomType.basePrice),
    status: roomType.status,
  };
}

/**
 * Folds flat `<prefix><field>` translation rows into `{ LOCALE: { field: value } }`.
 *
 * Translations are stored as keys rather than columns so adding a locale needs
 * no migration; this reshaping exists purely to give the admin form something to
 * bind to.
 */
export function nestTranslations(
  rows: Array<{ key: string; locale: string; value: string }>,
  prefix: string,
): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  for (const row of rows) {
    if (!row.key.startsWith(prefix)) continue;
    const field = row.key.slice(prefix.length);
    (out[row.locale] ??= {})[field] = row.value;
  }
  return out;
}

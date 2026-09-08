/**
 * Translation key for one amenity's display text.
 *
 * Keyed by name, not id, because `Hotel.amenities` stores names — rendering a
 * hotel's amenities in Arabic then needs no extra lookup. The cost is that a
 * rename has to move the key, which `AmenitiesService.update` does in the same
 * transaction as the rename itself.
 */
export const AMENITY_KEY_PREFIX = 'amenity.';

export function amenityTranslationKey(name: string): string {
  return `${AMENITY_KEY_PREFIX}${name}`;
}

/** Inverse of `amenityTranslationKey`, for grouping rows back by amenity. */
export function amenityNameFromKey(key: string): string {
  return key.slice(AMENITY_KEY_PREFIX.length);
}

/**
 * Groups flat translation rows into `{ name: { LOCALE: value } }` so the admin
 * list can be built from one query instead of one per amenity.
 */
export function groupTranslationsByName(
  rows: Array<{ key: string; locale: string; value: string }>,
): Map<string, Record<string, string>> {
  const byName = new Map<string, Record<string, string>>();
  for (const row of rows) {
    const name = amenityNameFromKey(row.key);
    const entry = byName.get(name) ?? {};
    entry[row.locale] = row.value;
    byName.set(name, entry);
  }
  return byName;
}

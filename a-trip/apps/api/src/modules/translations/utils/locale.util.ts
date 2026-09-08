import { Locale } from '../../../generated/prisma/enums';

/** Locale used when a key has no row for the one requested. */
export const FALLBACK_LOCALE: Locale = Locale.EN;

export const LOCALES: Locale[] = [Locale.EN, Locale.AR];

/** Right-to-left locales, so the site can set `dir` correctly. */
export const RTL_LOCALES: Locale[] = [Locale.AR];

/** Namespaces the admin screen groups keys by. */
export const TRANSLATION_NAMESPACES = ['ui', 'nav', 'setting', 'hotel'] as const;

/**
 * Flattens translation rows into one map, English underneath.
 *
 * A key with no row for the requested locale then shows its English wording
 * rather than a raw key. The web app layers its shipped JSON beneath both, which
 * is what makes a brand-new key readable before anyone has touched the admin
 * screen.
 */
export function buildTranslationMap(
  rows: Array<{ key: string; locale: Locale; value: string }>,
  locale: Locale,
): Record<string, string> {
  const map: Record<string, string> = {};
  // English first, then the requested locale overwrites it.
  for (const row of rows) {
    if (row.locale === FALLBACK_LOCALE) map[row.key] = row.value;
  }
  for (const row of rows) {
    if (row.locale === locale) map[row.key] = row.value;
  }
  return map;
}

/**
 * Resolves one key from an already-loaded map. An empty stored value counts as
 * absent, so clearing a field in the admin screen restores the default rather
 * than rendering a blank.
 */
export function localize(map: Record<string, string>, key: string, fallback: string): string {
  const value = map[key];
  return value === undefined || value === '' ? fallback : value;
}

/** The namespace an editor row is grouped under — the part before the first dot. */
export function namespaceOf(key: string): string {
  return key.split('.')[0];
}

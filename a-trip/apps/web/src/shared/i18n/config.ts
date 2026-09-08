import en from './messages/en.json';
import ar from './messages/ar.json';

export const LOCALES = ['EN', 'AR'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'EN';

/** Cookie the chosen locale is remembered in, read on the server for SSR. */
export const LOCALE_COOKIE = 'atrips.locale';

export const LOCALE_META: Record<Locale, { label: string; native: string; dir: 'ltr' | 'rtl'; htmlLang: string }> = {
  EN: { label: 'English', native: 'English', dir: 'ltr', htmlLang: 'en' },
  AR: { label: 'Arabic', native: 'العربية', dir: 'rtl', htmlLang: 'ar' },
};

/**
 * The strings that ship with the app. These are the source of truth in git and
 * the bottom layer at runtime: admin overrides from the API sit on top, so a
 * key is always readable even if nobody has translated it yet.
 */
export const MESSAGES: Record<Locale, Record<string, string>> = {
  EN: en as Record<string, string>,
  AR: ar as Record<string, string>,
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

export function normalizeLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/**
 * Resolves a key against the layered sources, newest first:
 * admin override → this locale's JSON → English JSON → the key itself.
 *
 * Returning the key rather than an empty string makes an untranslated string
 * obvious in the UI instead of silently rendering a blank.
 */
export function translate(
  key: string,
  locale: Locale,
  overrides: Record<string, string> | undefined,
  vars?: Record<string, string | number>,
): string {
  const raw =
    overrides?.[key] ||
    MESSAGES[locale]?.[key] ||
    MESSAGES[DEFAULT_LOCALE]?.[key] ||
    key;

  if (!vars) return raw;
  // {name} placeholders, so a translator can reorder them for their grammar.
  return raw.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

const PLURAL_RULES: Partial<Record<Locale, Intl.PluralRules>> = {};

function pluralRules(locale: Locale): Intl.PluralRules {
  const tag = LOCALE_META[locale].htmlLang;
  PLURAL_RULES[locale] ??= new Intl.PluralRules(tag);
  return PLURAL_RULES[locale] as Intl.PluralRules;
}

/**
 * Plural-aware lookup: `key` is a base, and the suffixed form for the count is
 * tried first — `ui.common.nights.one`, `.two`, `.few`, `.many`, `.other`.
 *
 * English needs two forms, Arabic needs six. Hardcoding an `n === 1 ? a : b`
 * check would be wrong in Arabic for 2, for 3–10, and for 11–99, so the
 * category comes from Intl.PluralRules rather than from a comparison.
 *
 * Falls back through the requested locale's `.other`, then the plain key, so a
 * half-translated set still renders words.
 */
export function translatePlural(
  key: string,
  count: number,
  locale: Locale,
  overrides: Record<string, string> | undefined,
  vars?: Record<string, string | number>,
): string {
  const category = pluralRules(locale).select(count);
  const allVars = { count, ...vars };

  for (const candidate of [`${key}.${category}`, `${key}.other`, key]) {
    const hit =
      overrides?.[candidate] || MESSAGES[locale]?.[candidate] || MESSAGES[DEFAULT_LOCALE]?.[candidate];
    if (hit) return translate(candidate, locale, overrides, allVars);
  }
  return translate(key, locale, overrides, allVars);
}

/**
 * Formats a number for the locale.
 *
 * Digits stay Latin in Arabic. `Intl.NumberFormat('ar-EG')` would render ٢٤,
 * but prices come from a USD formatter that emits "$110.00" in Latin — mixing
 * the two numbering systems on one line ("٣ ليالٍ · $110.00") reads worse than
 * using Latin throughout, which is also common on Egyptian sites. That is why
 * LOCALE_META.AR.htmlLang is 'ar' rather than 'ar-EG'; change it only alongside
 * a matching currency formatter, or the page will disagree with itself.
 */
export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(LOCALE_META[locale].htmlLang).format(value);
}

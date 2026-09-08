'use client';

import * as React from 'react';
import { useSiteContent } from '../hooks/use-site-content';
import { LocaleContext } from './locale-context';
import { LOCALE_META, formatNumber, translate, translatePlural, type Locale } from './config';

/**
 * Translation for client components.
 *
 * Overrides come from the same single site-content request the nav and settings
 * use, so switching language costs one fetch, not one per string.
 */
export function useTranslation() {
  const locale = React.useContext(LocaleContext);
  const { data } = useSiteContent();
  const overrides = data?.translations;

  const t = React.useCallback(
    (key: string, vars?: Record<string, string | number>) =>
      translate(key, locale, overrides, vars),
    [locale, overrides],
  );

  /**
   * Plural-aware: `tn('ui.common.nights', 3)` → "3 nights" / "٣ ليالٍ".
   *
   * The count is formatted in the locale's own digits and passed to the string
   * as {count}. Arabic distinguishes six plural categories to English's two, so
   * the form is chosen by Intl.PluralRules rather than an `n === 1` check.
   */
  const tn = React.useCallback(
    (key: string, count: number, vars?: Record<string, string | number>) =>
      translatePlural(key, count, locale, overrides, {
        ...vars,
        count: formatNumber(count, locale),
      }),
    [locale, overrides],
  );

  /** A bare number in the locale's numbering system. */
  const n = React.useCallback((value: number) => formatNumber(value, locale), [locale]);

  return { t, tn, n, locale, dir: LOCALE_META[locale].dir };
}

export function useLocale(): Locale {
  return React.useContext(LocaleContext);
}

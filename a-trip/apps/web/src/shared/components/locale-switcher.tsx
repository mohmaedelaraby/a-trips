'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Globe } from 'lucide-react';
import { LOCALES, LOCALE_COOKIE, LOCALE_META, type Locale } from '../i18n/config';
import { useTranslation } from '../i18n/use-translation';
import { cn } from '../lib/utils';
import styles from '../styles/locale-switcher.module.css';

/**
 * Writes the chosen locale to a cookie and reloads.
 *
 * A full reload rather than client state: the locale decides `<html dir>` and
 * the server-rendered copy, both of which are settled before React runs. A
 * client-only swap would leave the document direction wrong until the next
 * navigation.
 */
export function LocaleSwitcher({ className }: { className?: string }) {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const [pending, setPending] = React.useState<Locale | null>(null);

  const choose = (next: Locale) => {
    if (next === locale) return;
    setPending(next);
    // One year, path-wide, Lax: it is a display preference, not a credential.
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
    // refresh() re-renders the server tree; a hard reload guarantees `dir` and
    // `lang` on <html> follow, since those live outside the React root.
    window.location.reload();
  };

  return (
    <div className={cn(styles.wrap, className)} role="group" aria-label={t('ui.common.language')}>
      <Globe className={styles.icon} aria-hidden />
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          lang={LOCALE_META[code].htmlLang}
          aria-current={code === locale ? 'true' : undefined}
          disabled={pending !== null}
          className={cn(styles.option, code === locale && styles.optionActive)}
          onClick={() => choose(code)}
        >
          {LOCALE_META[code].native}
        </button>
      ))}
    </div>
  );
}

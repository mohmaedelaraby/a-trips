'use client';

import * as React from 'react';
import {
  useAdminTranslations,
  useUpdateTranslations,
} from '../../../modules/admin-dashboard/hooks/use-translations';
import { LOCALES, LOCALE_META, MESSAGES, type Locale } from '../../../shared/i18n/config';
import type { AdminTranslation } from '../../../shared/interfaces/site-content';
import {
  AdminTopbar,
  Panel,
  Pill,
  Segmented,
  adminUi as ui,
} from '../../../modules/admin-dashboard/components/admin-ui';
import { Skeleton } from '../../../shared/components/skeleton';
import { cn } from '../../../shared/lib/utils';
import styles from '../styles/admin-translations.module.css';

type NamespaceTab = 'all' | 'ui' | 'nav' | 'setting' | 'hotel' | 'roomType';

const NAMESPACE_HINT: Record<string, string> = {
  ui: 'Interface labels shipped in the app’s JSON files',
  nav: 'Header and footer link labels',
  setting: 'Contact details, social links, home page copy',
  hotel: 'Hotel names, descriptions, cities and addresses',
  roomType: 'Room type names and descriptions',
};

/** Long copy gets a textarea; short labels get one line. */
function isLongForm(key: string) {
  return /\.(description|heroSubtitle|tagline)$/.test(key);
}

/**
 * A readable stand-in for a raw key like "ui.account.dateOfBirth" — content
 * editors translating copy have no reason to read dotted code identifiers, so
 * this is what shows by default. The key itself only appears when "Show
 * technical keys" is on, for whoever is cross-referencing the source.
 */
function humanizeKey(key: string): string {
  const last = key.split('.').pop() ?? key;
  const spaced = last.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ');
  const words = spaced.toLowerCase().split(' ').filter(Boolean);
  if (words.length === 0) return key;
  words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);
  return words.join(' ');
}

function TranslationRow({
  row,
  draft,
  showKeys,
  onChange,
}: {
  row: AdminTranslation;
  draft: Partial<Record<Locale, string>>;
  showKeys: boolean;
  onChange: (locale: Locale, value: string) => void;
}) {
  const shipped = MESSAGES.EN[row.key];

  return (
    <div className={styles.row}>
      <div className={styles.keyCol}>
        {showKeys ? (
          <code className={styles.key}>{row.key}</code>
        ) : (
          <p className={styles.keyLabel}>{row.context ?? humanizeKey(row.key)}</p>
        )}
        {showKeys && row.context ? <p className={styles.context}>{row.context}</p> : null}
        {shipped ? <p className={styles.shipped}>Ships as: “{shipped}”</p> : null}
      </div>

      {LOCALES.map((locale) => {
        const stored = row.values[locale] ?? '';
        const value = draft[locale] ?? stored;
        const meta = LOCALE_META[locale];
        return (
          <label key={locale} className={styles.localeCol}>
            <span className={ui.fieldLabel}>{meta.native}</span>
            {isLongForm(row.key) ? (
              <textarea
                className={ui.input}
                rows={2}
                dir={meta.dir}
                lang={meta.htmlLang}
                value={value}
                placeholder={locale === 'EN' ? shipped : ''}
                onChange={(e) => onChange(locale, e.target.value)}
              />
            ) : (
              <input
                className={ui.input}
                dir={meta.dir}
                lang={meta.htmlLang}
                value={value}
                placeholder={locale === 'EN' ? shipped : ''}
                onChange={(e) => onChange(locale, e.target.value)}
              />
            )}
          </label>
        );
      })}

      <div className={styles.statusCol}>
        {row.values.AR ? <Pill tone="success">AR</Pill> : <Pill tone="warning">No AR</Pill>}
      </div>
    </div>
  );
}

export default function AdminTranslationsPage() {
  // The API does not know the app's UI keys — they live in the JSON files — so
  // the catalogue is sent up with the request. That is what makes a string
  // editable before anyone has ever overridden it.
  const knownKeys = React.useMemo(
    () => Object.keys(MESSAGES.EN).map((key) => ({ key })),
    [],
  );

  const query = useAdminTranslations(knownKeys);
  const update = useUpdateTranslations();

  const [tab, setTab] = React.useState<NamespaceTab>('all');
  const [search, setSearch] = React.useState('');
  const [drafts, setDrafts] = React.useState<Record<string, Partial<Record<Locale, string>>>>({});
  const [onlyMissing, setOnlyMissing] = React.useState(false);
  // Off by default: a raw key like "ui.account.dateOfBirth" is a code
  // identifier, not something a translator needs to read.
  const [showKeys, setShowKeys] = React.useState(false);

  const rows = query.data ?? [];

  const filtered = rows.filter((row) => {
    if (tab !== 'all' && row.namespace !== tab) return false;
    if (onlyMissing && row.values.AR) return false;
    if (!search) return true;
    const needle = search.toLowerCase();
    return (
      row.key.toLowerCase().includes(needle) ||
      Object.values(row.values).some((v) => v.toLowerCase().includes(needle))
    );
  });

  const changes = Object.entries(drafts).flatMap(([key, byLocale]) =>
    (Object.entries(byLocale) as Array<[Locale, string]>)
      .filter(([locale, value]) => {
        const row = rows.find((r) => r.key === key);
        return row ? value !== (row.values[locale] ?? '') : false;
      })
      .map(([locale, value]) => ({ key, locale, value })),
  );

  const save = () => {
    if (changes.length === 0) return;
    update.mutate(changes, { onSuccess: () => setDrafts({}) });
  };

  const missingCount = rows.filter((r) => !r.values.AR).length;

  return (
    <>
      <AdminTopbar title="Translations" meta={`${rows.length} keys`}>
        <input
          type="search"
          className={ui.search}
          placeholder="Search keys or text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search translations"
        />
        <button
          type="button"
          className={cn(ui.btn, ui.btnPrimary)}
          disabled={changes.length === 0 || update.isPending}
          onClick={save}
        >
          {update.isPending
            ? 'Saving…'
            : changes.length > 0
              ? `Save ${changes.length} change${changes.length === 1 ? '' : 's'}`
              : 'Saved'}
        </button>
      </AdminTopbar>

      <div className={ui.body}>
        <p className={styles.intro}>
          Every piece of text on the site, in each language. Leave a field blank and the shipped
          English wording is used instead — so a missing translation never renders a raw key.
        </p>

        <div className={styles.filters}>
          <Segmented<NamespaceTab>
            value={tab}
            onChange={setTab}
            options={[
              { value: 'all', label: 'All', count: rows.length },
              { value: 'ui', label: 'Interface', count: rows.filter((r) => r.namespace === 'ui').length },
              { value: 'nav', label: 'Navigation', count: rows.filter((r) => r.namespace === 'nav').length },
              { value: 'setting', label: 'Site copy', count: rows.filter((r) => r.namespace === 'setting').length },
              { value: 'hotel', label: 'Hotels', count: rows.filter((r) => r.namespace === 'hotel').length },
            ]}
          />
          <label className={styles.missingToggle}>
            <input
              type="checkbox"
              checked={onlyMissing}
              onChange={(e) => setOnlyMissing(e.target.checked)}
            />
            Only missing Arabic ({missingCount})
          </label>
          <label className={styles.missingToggle}>
            <input
              type="checkbox"
              checked={showKeys}
              onChange={(e) => setShowKeys(e.target.checked)}
            />
            Show technical keys
          </label>
        </div>

        {tab !== 'all' && NAMESPACE_HINT[tab] ? (
          <p className={styles.namespaceHint}>{NAMESPACE_HINT[tab]}</p>
        ) : null}

        <Panel>
          <div className={styles.list}>
            {query.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : filtered.length === 0 ? (
              <p className={styles.empty}>No keys match.</p>
            ) : (
              filtered.map((row) => (
                <TranslationRow
                  key={row.key}
                  row={row}
                  draft={drafts[row.key] ?? {}}
                  showKeys={showKeys}
                  onChange={(locale, value) =>
                    setDrafts((d) => ({ ...d, [row.key]: { ...d[row.key], [locale]: value } }))
                  }
                />
              ))
            )}
          </div>
        </Panel>
      </div>
    </>
  );
}

'use client';

import * as React from 'react';
import { RotateCcw } from 'lucide-react';
import {
  useAdminSiteSettings,
  useResetSiteSetting,
  useUpdateSiteSettings,
} from '../../../modules/admin-dashboard/hooks/use-site-content';
import type { AdminSiteSetting } from '../../../shared/interfaces/site-content';
import {
  AdminTopbar,
  Panel,
  PanelHead,
  Pill,
  adminUi as ui,
} from '../../../modules/admin-dashboard/components/admin-ui';
import { Skeleton } from '../../../shared/components/skeleton';
import { cn } from '../../../shared/lib/utils';
import styles from '../styles/admin-site-settings.module.css';

/** Human headings for the groups the API returns, in display order. */
const GROUP_META: Array<{ key: string; title: string; hint: string }> = [
  { key: 'contact', title: 'Contact details', hint: 'Shown in the footer’s “Get in touch” column' },
  { key: 'social', title: 'Social links', hint: 'Leave blank to show the badge without a link' },
  { key: 'footer', title: 'Footer copy', hint: 'The tagline and the small print line' },
  { key: 'home', title: 'Home page', hint: 'The hero heading and subheading' },
  { key: 'general', title: 'General', hint: 'Site-wide labels' },
];

/** Longer copy gets a textarea; short labels get a single line. */
function isLongForm(key: string) {
  return key === 'footer.tagline' || key === 'home.heroSubtitle';
}

function SettingsGroup({
  title,
  hint,
  settings,
}: {
  title: string;
  hint: string;
  settings: AdminSiteSetting[];
}) {
  const update = useUpdateSiteSettings();
  const reset = useResetSiteSetting();

  const [draft, setDraft] = React.useState<Record<string, string>>({});

  // Re-sync when the server sends new values, without clobbering an in-progress edit.
  React.useEffect(() => {
    setDraft((current) => {
      const next = { ...current };
      for (const setting of settings) {
        if (!(setting.key in next)) next[setting.key] = setting.value;
      }
      return next;
    });
  }, [settings]);

  const changed = settings.filter(
    (s) => draft[s.key] !== undefined && draft[s.key] !== s.value,
  );

  const save = () => {
    if (changed.length === 0) return;
    update.mutate(changed.map((s) => ({ key: s.key, value: draft[s.key] })));
  };

  return (
    <Panel>
      <PanelHead title={title} hint={hint}>
        <button
          type="button"
          className={cn(ui.btn, ui.btnPrimary)}
          disabled={changed.length === 0 || update.isPending}
          onClick={save}
        >
          {update.isPending
            ? 'Saving…'
            : changed.length > 0
              ? `Save ${changed.length} change${changed.length === 1 ? '' : 's'}`
              : 'Saved'}
        </button>
      </PanelHead>

      <div className={styles.body}>
        {settings.map((setting) => {
          const value = draft[setting.key] ?? setting.value;
          const dirty = value !== setting.value;
          return (
            <div key={setting.key} className={styles.row}>
              <div className={styles.labelCol}>
                <label htmlFor={setting.key} className={ui.fieldLabel}>
                  {setting.label}
                </label>
                <code className={styles.key}>{setting.key}</code>
              </div>

              <div className={styles.inputCol}>
                {isLongForm(setting.key) ? (
                  <textarea
                    id={setting.key}
                    className={ui.input}
                    rows={2}
                    value={value}
                    maxLength={2000}
                    onChange={(e) => setDraft((d) => ({ ...d, [setting.key]: e.target.value }))}
                  />
                ) : (
                  <input
                    id={setting.key}
                    className={ui.input}
                    value={value}
                    maxLength={2000}
                    onChange={(e) => setDraft((d) => ({ ...d, [setting.key]: e.target.value }))}
                  />
                )}
              </div>

              <div className={styles.metaCol}>
                {dirty ? (
                  <Pill tone="warning">Unsaved</Pill>
                ) : setting.isDefault ? (
                  <Pill tone="neutral">Default</Pill>
                ) : (
                  <Pill tone="success">Custom</Pill>
                )}
                <button
                  type="button"
                  className={styles.resetBtn}
                  aria-label={`Restore the default for ${setting.label}`}
                  title="Restore the shipped default"
                  disabled={setting.isDefault || reset.isPending}
                  onClick={() => {
                    if (window.confirm(`Restore the default for “${setting.label}”?`)) {
                      setDraft((d) => {
                        const next = { ...d };
                        delete next[setting.key];
                        return next;
                      });
                      reset.mutate(setting.key);
                    }
                  }}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

export default function AdminSiteSettingsPage() {
  const query = useAdminSiteSettings();
  const settings = query.data ?? [];

  // Any group the API invents that this page has no heading for still renders.
  const knownKeys = GROUP_META.map((g) => g.key);
  const extraGroups = [...new Set(settings.map((s) => s.group))].filter(
    (g) => !knownKeys.includes(g),
  );

  return (
    <>
      <AdminTopbar title="Site content" meta={`${settings.length} settings`} />

      <div className={ui.body}>
        <p className={styles.intro}>
          The wording that appears around the site — contact details, social links, the home page
          hero. Hotel information is edited on the <strong>Hotels</strong> screen; links are on{' '}
          <strong>Navigation links</strong>.
        </p>

        {query.isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className={styles.groups}>
            {[...GROUP_META, ...extraGroups.map((key) => ({ key, title: key, hint: '' }))].map(
              (meta) => {
                const rows = settings.filter((s) => s.group === meta.key);
                if (rows.length === 0) return null;
                return (
                  <SettingsGroup
                    key={meta.key}
                    title={meta.title}
                    hint={meta.hint}
                    settings={rows}
                  />
                );
              },
            )}
          </div>
        )}
      </div>
    </>
  );
}

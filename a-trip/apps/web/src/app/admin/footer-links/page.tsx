'use client';

import * as React from 'react';
import { ArrowDown, ArrowUp, ExternalLink, Trash2 } from 'lucide-react';
import {
  useAdminFooterLinks,
  useCreateFooterLink,
  useDeleteFooterLink,
  useReorderFooterLinks,
  useUpdateFooterLink,
} from '../../../modules/admin-dashboard/hooks/use-footer-links';
import {
  FOOTER_GROUP_LABEL,
  type AdminFooterLink,
  type FooterLinkGroup,
} from '../../../shared/interfaces/footer-links';
import {
  AdminTopbar,
  Panel,
  PanelHead,
  Pill,
  Toggle,
  adminUi as ui,
} from '../../../modules/admin-dashboard/components/admin-ui';
import { Skeleton } from '../../../shared/components/skeleton';
import { cn } from '../../../shared/lib/utils';
import styles from '../styles/admin-footer-links.module.css';

const GROUPS: FooterLinkGroup[] = ['COMPANY', 'SUPPORT'];

/** Mirrors the server rule, so a bad value is caught before the round trip. */
function hrefError(href: string): string | null {
  const trimmed = href.trim();
  if (!trimmed) return null; // blank is valid — it means "coming soon"
  if (trimmed.startsWith('/')) return null;
  if (/^https?:\/\/\S+$/i.test(trimmed)) return null;
  return 'Use “/page” for this site, or a full https:// address';
}

function LinkRow({
  link,
  index,
  total,
  onMove,
}: {
  link: AdminFooterLink;
  index: number;
  total: number;
  onMove: (from: number, to: number) => void;
}) {
  const update = useUpdateFooterLink();
  const remove = useDeleteFooterLink();

  const [value, setValue] = React.useState(link.value);
  const [href, setHref] = React.useState(link.href ?? '');
  const [error, setError] = React.useState<string | null>(null);

  // Re-sync when the row is reordered or refetched underneath us.
  React.useEffect(() => {
    setValue(link.value);
    setHref(link.href ?? '');
  }, [link.value, link.href]);

  const dirty = value.trim() !== link.value || href.trim() !== (link.href ?? '');

  const save = () => {
    const problem = hrefError(href);
    if (problem) return setError(problem);
    if (value.trim().length < 1) return setError('Text is required');
    setError(null);
    update.mutate({ id: link.id, value: value.trim(), href: href.trim() || null });
  };

  return (
    <div className={cn(styles.row, !link.isActive && styles.rowHidden)}>
      <div className={styles.reorder}>
        <button
          type="button"
          className={styles.moveBtn}
          aria-label="Move up"
          disabled={index === 0}
          onClick={() => onMove(index, index - 1)}
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className={styles.moveBtn}
          aria-label="Move down"
          disabled={index === total - 1}
          onClick={() => onMove(index, index + 1)}
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className={styles.fields}>
        <label className={styles.field}>
          <span className={ui.fieldLabel}>Text on screen</span>
          <input
            className={ui.input}
            value={value}
            maxLength={60}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Help centre"
          />
        </label>

        <label className={styles.field}>
          <span className={ui.fieldLabel}>Links to</span>
          <input
            className={ui.input}
            value={href}
            maxLength={300}
            onChange={(e) => setHref(e.target.value)}
            placeholder="/hotels  or  https://example.com"
          />
        </label>
      </div>

      <div className={styles.rowMeta}>
        {href.trim() === '' ? (
          <Pill tone="neutral">Coming soon</Pill>
        ) : /^https?:\/\//i.test(href.trim()) ? (
          <Pill tone="warning">
            <ExternalLink className="h-3 w-3" /> External
          </Pill>
        ) : (
          <Pill tone="success">Internal</Pill>
        )}

        <Toggle
          checked={link.isActive}
          onChange={(next) => update.mutate({ id: link.id, isActive: next })}
          label={link.isActive ? 'Visible' : 'Hidden'}
        />
      </div>

      <div className={styles.rowActions}>
        <button
          type="button"
          className={cn(ui.btn, ui.btnPrimary)}
          disabled={!dirty || update.isPending}
          onClick={save}
        >
          {update.isPending ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          className={cn(ui.btn, ui.btnDanger)}
          aria-label={`Delete ${link.value}`}
          disabled={remove.isPending}
          onClick={() => {
            if (window.confirm(`Remove “${link.value}” from the footer?`)) remove.mutate(link.id);
          }}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {error ? <p className={styles.rowError}>{error}</p> : null}
    </div>
  );
}

function AddLinkForm({ group }: { group: FooterLinkGroup }) {
  const create = useCreateFooterLink();
  const [value, setValue] = React.useState('');
  const [href, setHref] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (value.trim().length < 1) return setError('Text is required');
    const problem = hrefError(href);
    if (problem) return setError(problem);
    setError(null);
    create.mutate(
      { group, value: value.trim(), href: href.trim() || null },
      {
        onSuccess: () => {
          setValue('');
          setHref('');
        },
      },
    );
  };

  return (
    <form className={styles.addForm} onSubmit={submit}>
      <input
        className={ui.input}
        value={value}
        maxLength={60}
        placeholder="Text on screen"
        onChange={(e) => setValue(e.target.value)}
        aria-label={`New ${FOOTER_GROUP_LABEL[group]} link text`}
      />
      <input
        className={ui.input}
        value={href}
        maxLength={300}
        placeholder="Links to — leave blank for “coming soon”"
        onChange={(e) => setHref(e.target.value)}
        aria-label={`New ${FOOTER_GROUP_LABEL[group]} link destination`}
      />
      <button
        type="submit"
        className={cn(ui.btn, ui.btnPrimary)}
        disabled={create.isPending}
      >
        {create.isPending ? 'Adding…' : '+ Add link'}
      </button>
      {error ? <p className={styles.rowError}>{error}</p> : null}
    </form>
  );
}

export default function AdminFooterLinksPage() {
  const query = useAdminFooterLinks();
  const reorder = useReorderFooterLinks();
  const links = query.data ?? [];

  const byGroup = (group: FooterLinkGroup) =>
    links.filter((l) => l.group === group).sort((a, b) => a.sortOrder - b.sortOrder);

  const move = (group: FooterLinkGroup) => (from: number, to: number) => {
    const ids = byGroup(group).map((l) => l.id);
    if (to < 0 || to >= ids.length) return;
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    reorder.mutate({ group, ids });
  };

  return (
    <>
      <AdminTopbar
        title="Footer links"
        meta={`${links.length} link${links.length === 1 ? '' : 's'}`}
      />

      <div className={ui.body}>
        <p className={styles.intro}>
          These are the two link columns in the site footer. <strong>Text on screen</strong> is what
          a visitor reads; <strong>Links to</strong> is where the click goes. Leave the destination
          blank and the link points at the “coming soon” page instead of going nowhere.
        </p>

        <div className={styles.columns}>
          {GROUPS.map((group) => {
            const rows = byGroup(group);
            return (
              <Panel key={group}>
                <PanelHead
                  title={FOOTER_GROUP_LABEL[group]}
                  hint={`${rows.length} link${rows.length === 1 ? '' : 's'} · shown in this order`}
                />
                <div className={styles.panelBody}>
                  {query.isLoading ? (
                    <Skeleton className="h-40 w-full" />
                  ) : rows.length === 0 ? (
                    <p className={styles.empty}>No links in this column yet.</p>
                  ) : (
                    rows.map((link, index) => (
                      <LinkRow
                        key={link.id}
                        link={link}
                        index={index}
                        total={rows.length}
                        onMove={move(group)}
                      />
                    ))
                  )}

                  <AddLinkForm group={group} />
                </div>
              </Panel>
            );
          })}
        </div>
      </div>
    </>
  );
}

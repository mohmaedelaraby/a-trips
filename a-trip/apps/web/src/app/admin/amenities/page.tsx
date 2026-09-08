'use client';

import * as React from 'react';
import {
  useAmenities,
  useCreateAmenity,
  useDeleteAmenity,
  useUpdateAmenity,
} from '../../../modules/admin-dashboard/hooks/use-admin-users';
import {
  AdminTopbar,
  Panel,
  Pill,
  adminUi as ui,
} from '../../../modules/admin-dashboard/components/admin-ui';
import type { Amenity } from '../../../modules/admin-dashboard/interfaces/admin-users';
import { Skeleton } from '../../../shared/components/skeleton';
import { cn } from '../../../shared/lib/utils';
import styles from '../styles/admin-users.module.css';

/**
 * Inline Arabic label for one amenity.
 *
 * Edited in place rather than behind the rename prompt: the catalogue is a long
 * list, and translating it is a pass down the column, not one row at a time.
 * Saves on blur or Enter, and only when the value actually changed.
 */
function ArabicCell({ amenity }: { amenity: Amenity }) {
  const update = useUpdateAmenity();
  const stored = amenity.translations?.AR ?? '';
  const [draft, setDraft] = React.useState(stored);

  React.useEffect(() => setDraft(stored), [stored]);

  const commit = () => {
    if (draft.trim() === stored) return;
    update.mutate({
      id: amenity.id,
      name: amenity.name,
      category: amenity.category ?? undefined,
      translations: { AR: draft.trim() },
    });
  };

  return (
    <input
      className={ui.input}
      dir="rtl"
      lang="ar"
      value={draft}
      maxLength={80}
      placeholder={amenity.name}
      aria-label={`Arabic for ${amenity.name}`}
      disabled={update.isPending}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur();
      }}
    />
  );
}

export default function AdminAmenitiesPage() {
  const query = useAmenities();
  const create = useCreateAmenity();
  const update = useUpdateAmenity();
  const remove = useDeleteAmenity();

  const [name, setName] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [arabic, setArabic] = React.useState('');
  const [search, setSearch] = React.useState('');

  const amenities = React.useMemo(() => {
    const list = query.data ?? [];
    const needle = search.trim().toLowerCase();
    return needle
      ? list.filter(
          (amenity) =>
            amenity.name.toLowerCase().includes(needle) ||
            (amenity.category ?? '').toLowerCase().includes(needle),
        )
      : list;
  }, [query.data, search]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 2) return;
    create.mutate(
      {
        name: name.trim(),
        category: category.trim() || undefined,
        // Omitted when blank so the row is created without an empty override.
        translations: arabic.trim() ? { AR: arabic.trim() } : undefined,
      },
      {
        onSuccess: () => {
          setName('');
          setCategory('');
          setArabic('');
        },
      },
    );
  };

  return (
    <>
      <AdminTopbar title="Amenities" meta={query.data ? `${query.data.length} in catalogue` : undefined}>
        <input
          type="search"
          className={ui.search}
          placeholder="Search amenities"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search amenities"
        />
      </AdminTopbar>

      <div className={ui.body}>
        <div className={styles.layout}>
          <Panel>
            <div className={ui.tableWrap}>
              <table className={ui.table}>
                <thead>
                  <tr>
                    <th>Amenity</th>
                    <th>العربية</th>
                    <th>Category</th>
                    <th>Hotels using it</th>
                    <th className={ui.numeric}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {query.isLoading ? (
                    Array.from({ length: 6 }, (_, i) => (
                      <tr key={i}>
                        <td colSpan={5}>
                          <Skeleton className="h-8 w-full" />
                        </td>
                      </tr>
                    ))
                  ) : amenities.length === 0 ? (
                    <tr>
                      <td colSpan={5} className={ui.emptyRow}>
                        No amenities match this search.
                      </td>
                    </tr>
                  ) : (
                    amenities.map((amenity) => (
                      <tr key={amenity.id}>
                        <td className={ui.cellStrong}>{amenity.name}</td>
                        <td>
                          <ArabicCell amenity={amenity} />
                        </td>
                        <td>{amenity.category ?? '—'}</td>
                        <td>
                          {amenity.hotelCount > 0 ? (
                            <Pill tone="success">{amenity.hotelCount} hotels</Pill>
                          ) : (
                            <Pill tone="neutral">Unused</Pill>
                          )}
                        </td>
                        <td>
                          <div className={ui.actionsCell}>
                            <button
                              type="button"
                              className={ui.actionLink}
                              disabled={update.isPending}
                              onClick={() => {
                                const next = window.prompt('Rename amenity', amenity.name);
                                if (next?.trim() && next.trim() !== amenity.name) {
                                  update.mutate({
                                    id: amenity.id,
                                    name: next.trim(),
                                    category: amenity.category ?? undefined,
                                  });
                                }
                              }}
                            >
                              Rename
                            </button>
                            <button
                              type="button"
                              className={ui.actionLink}
                              disabled={remove.isPending}
                              onClick={() => {
                                if (window.confirm(`Remove "${amenity.name}" from the catalogue?`)) {
                                  remove.mutate(amenity.id);
                                }
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Panel>

          <div className={styles.rail}>
            <form className={styles.invitePanel} onSubmit={submit}>
              <div className={styles.inviteHead}>Add an amenity</div>
              <div className={styles.inviteBody}>
                <div>
                  <label htmlFor="amenity-name" className={ui.fieldLabel}>
                    Name
                  </label>
                  <input
                    id="amenity-name"
                    className={ui.input}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Rooftop pool"
                  />
                </div>
                <div>
                  <label htmlFor="amenity-arabic" className={ui.fieldLabel}>
                    Arabic name
                  </label>
                  <input
                    id="amenity-arabic"
                    className={ui.input}
                    dir="rtl"
                    lang="ar"
                    maxLength={80}
                    value={arabic}
                    onChange={(event) => setArabic(event.target.value)}
                    placeholder="مسبح علوي"
                  />
                </div>
                <div>
                  <label htmlFor="amenity-category" className={ui.fieldLabel}>
                    Category
                  </label>
                  <input
                    id="amenity-category"
                    className={ui.input}
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    placeholder="Leisure"
                  />
                </div>
                <button
                  type="submit"
                  className={cn(ui.btn, ui.btnPrimary, ui.btnBlock, ui.btnLg)}
                  disabled={create.isPending}
                >
                  {create.isPending ? 'Adding…' : 'Add amenity'}
                </button>
                <p className={styles.inviteFootnote}>
                  Amenities appear as suggestions in the hotel editor.
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

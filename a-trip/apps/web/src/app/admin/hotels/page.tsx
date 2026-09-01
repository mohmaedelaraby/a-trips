'use client';

import * as React from 'react';
import Link from 'next/link';
import { useAdminHotels } from '../../../modules/hotels/hooks/use-admin-hotels';
import { useCities } from '../../../modules/hotels/hooks/use-hotels';
import { useAdminDashboard } from '../../../modules/admin-dashboard/hooks/use-dashboard';
import {
  AdminTopbar,
  Pagination,
  Panel,
  Pill,
  Segmented,
  adminUi as ui,
} from '../../../modules/admin-dashboard/components/admin-ui';
import { Skeleton } from '../../../shared/components/skeleton';
import { cn } from '../../../shared/lib/utils';
import type { HotelStatus } from '../../../shared/interfaces/api';
import styles from '../styles/admin-hotels.module.css';

const PAGE_SIZE = 5;

type TabValue = 'all' | 'PUBLISHED' | 'DRAFT';

function Stars({ value }: { value: number }) {
  return (
    <span className={styles.stars} aria-label={`${value} stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < value ? undefined : styles.starEmpty}>
          ★
        </span>
      ))}
    </span>
  );
}

export default function AdminHotelsListPage() {
  const [q, setQ] = React.useState('');
  const [tab, setTab] = React.useState<TabValue>('all');
  const [city, setCity] = React.useState('');
  const [stars, setStars] = React.useState('');
  const [page, setPage] = React.useState(1);

  const dashboard = useAdminDashboard();
  const cities = useCities();
  const query = useAdminHotels({
    q: q || undefined,
    status: tab === 'all' ? undefined : (tab as HotelStatus),
    city: city || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const reset = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  // The API has no stars filter, so it is applied to the returned page.
  const items = React.useMemo(() => {
    const list = query.data?.items ?? [];
    return stars ? list.filter((hotel) => hotel.stars === Number(stars)) : list;
  }, [query.data, stars]);

  const meta = query.data?.meta;
  const rangeStart = meta && meta.total > 0 ? (meta.page - 1) * PAGE_SIZE + 1 : 0;
  const rangeEnd = meta ? Math.min(meta.page * PAGE_SIZE, meta.total) : 0;

  return (
    <>
      <AdminTopbar title="Hotels" meta={meta ? `${meta.total} total` : undefined}>
        <input
          type="search"
          className={ui.search}
          placeholder="Search by name or city"
          value={q}
          onChange={(event) => reset(setQ)(event.target.value)}
          aria-label="Search hotels"
        />
        <Link href="/admin/hotels/new" className={cn(ui.btn, ui.btnPrimary)}>
          + Add hotel
        </Link>
      </AdminTopbar>

      <div className={ui.body}>
        <div className={styles.filters}>
          <Segmented<TabValue>
            value={tab}
            onChange={reset(setTab)}
            options={[
              { value: 'all', label: 'All', count: dashboard.data?.totalHotels },
              { value: 'PUBLISHED', label: 'Published', count: dashboard.data?.publishedHotels },
              { value: 'DRAFT', label: 'Draft', count: dashboard.data?.draftHotels },
            ]}
          />

          <div className={styles.filterGroup}>
            <select
              className={ui.select}
              value={city}
              onChange={(event) => reset(setCity)(event.target.value)}
              aria-label="Filter by city"
            >
              <option value="">City: All</option>
              {cities.data?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.value}
                </option>
              ))}
            </select>
            <select
              className={ui.select}
              value={stars}
              onChange={(event) => reset(setStars)(event.target.value)}
              aria-label="Filter by stars"
            >
              <option value="">Stars: All</option>
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>
                  {value} stars
                </option>
              ))}
            </select>
          </div>
        </div>

        <Panel>
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th>Hotel</th>
                  <th>City</th>
                  <th>Stars</th>
                  <th>Room types</th>
                  <th>Status</th>
                  <th className={ui.numeric}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {query.isLoading && !query.data ? (
                  Array.from({ length: PAGE_SIZE }, (_, i) => (
                    <tr key={i}>
                      <td colSpan={6}>
                        <Skeleton className="h-8 w-full" />
                      </td>
                    </tr>
                  ))
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={ui.emptyRow}>
                      No hotels match these filters.
                    </td>
                  </tr>
                ) : (
                  items.map((hotel) => {
                    const draft = hotel.status === 'DRAFT';
                    const cover = hotel.images.find((image) => image.isPrimary) ?? hotel.images[0];
                    return (
                      <tr key={hotel.id}>
                        <td>
                          <div className={styles.hotelCell}>
                            {cover ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={cover.url} alt="" className={ui.thumb} />
                            ) : (
                              <span className={styles.thumbPlaceholder}>none</span>
                            )}
                            <div>
                              <p className={cn(styles.hotelName, draft && styles.hotelNameDraft)}>{hotel.name}</p>
                              {hotel.images.length === 0 ? (
                                <p className={styles.hotelWarning}>No photos uploaded</p>
                              ) : (
                                <p className={styles.hotelAddress}>{hotel.address}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>{hotel.city}</td>
                        <td>
                          <Stars value={hotel.stars} />
                        </td>
                        <td>{hotel.roomTypeCount}</td>
                        <td>
                          <Pill tone={draft ? 'neutral' : 'success'}>{draft ? 'Draft' : 'Published'}</Pill>
                        </td>
                        <td>
                          <div className={ui.actionsCell}>
                            <Link href={`/admin/hotels/${hotel.id}`} className={ui.actionLink}>
                              Edit
                            </Link>
                            <Link href={`/admin/hotels/${hotel.id}/room-types`} className={ui.actionLink}>
                              Rooms
                            </Link>
                            <Link
                              href={`/admin/hotels/${hotel.id}/availability`}
                              className={cn(ui.actionLink, draft && ui.actionLinkDisabled)}
                              aria-disabled={draft}
                              tabIndex={draft ? -1 : undefined}
                            >
                              Availability
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {meta ? (
            <div className={ui.footerBar}>
              <span>
                Showing {rangeStart}–{rangeEnd} of {meta.total}
              </span>
              <Pagination page={meta.page} pageCount={meta.totalPages} onChange={setPage} />
            </div>
          ) : null}
        </Panel>
      </div>
    </>
  );
}

'use client';

import Link from 'next/link';
import { CalendarX2 } from 'lucide-react';
import { useAvailabilityGaps } from '../hooks/use-dashboard';
import { Panel, Pill } from './admin-ui';
import { Skeleton } from '../../../shared/components/skeleton';
import { formatDate } from '../../../shared/lib/utils';
import styles from '../styles/availability-gaps.module.css';

/**
 * Warns staff about dates never opened for sale.
 *
 * A date with no availability row is unsellable, and a guest sees exactly the
 * same "no rooms available" as a genuinely sold-out hotel. That makes an
 * unopened calendar invisible unless it is surfaced here.
 *
 * `compact` renders the dashboard rail version; the full version is for the
 * availability page, where staff are already in the right frame of mind to fix it.
 */
export function AvailabilityGapsPanel({ compact = false }: { compact?: boolean }) {
  const query = useAvailabilityGaps();
  const data = query.data;
  const rows = compact ? (data?.items ?? []).slice(0, 5) : (data?.items ?? []);

  return (
    <Panel>
      <div className={styles.body}>
        <div className={styles.head}>
          <h2 className={styles.title}>
            <CalendarX2 className={styles.titleIcon} aria-hidden />
            Dates not on sale
          </h2>
          {data && data.totalRoomTypesWithGaps > 0 ? (
            <Pill tone={data.neverOpenedCount > 0 ? 'danger' : 'warning'}>
              {data.totalRoomTypesWithGaps}
            </Pill>
          ) : null}
        </div>

        {query.isLoading ? (
          <Skeleton className="mt-3 h-24 w-full" />
        ) : query.isError ? (
          <p className={styles.hint}>Could not load the availability check.</p>
        ) : !data || data.totalRoomTypesWithGaps === 0 ? (
          <p className={styles.hint}>
            Every active room type is open for sale for the next {data?.horizonDays ?? 90} days.
          </p>
        ) : (
          <>
            <p className={styles.hint}>
              {data.neverOpenedCount > 0 ? (
                <>
                  <strong className={styles.danger}>
                    {data.neverOpenedCount} room type{data.neverOpenedCount === 1 ? '' : 's'} have no
                    dates on sale at all
                  </strong>{' '}
                  and cannot be booked by anyone. Guests see &ldquo;no rooms available&rdquo;.
                </>
              ) : (
                <>
                  These room types have gaps in the next {data.horizonDays} days. Guests searching
                  those dates are told no rooms are available.
                </>
              )}
            </p>

            <div className={styles.list}>
              {rows.map((row) => (
                <div key={row.roomTypeId} className={styles.row}>
                  <div className={styles.rowMain}>
                    <p className={styles.rowName}>
                      {row.hotelName} · {row.roomTypeName}
                    </p>
                    <p className={styles.rowMeta}>
                      {row.neverOpened
                        ? 'No dates opened'
                        : `${row.missingDays} day${row.missingDays === 1 ? '' : 's'} unopened${
                            row.firstGap ? ` from ${formatDate(row.firstGap)}` : ''
                          }`}
                    </p>
                  </div>
                  <div className={styles.rowActions}>
                    {row.neverOpened ? <Pill tone="danger">Not on sale</Pill> : null}
                    {/* Straight to the calendar route: the hotel-scoped path
                        redirects here but drops roomTypeId on the way. */}
                    <Link
                      href={`/admin/availability?hotelId=${row.hotelId}&roomTypeId=${row.roomTypeId}`}
                      className={styles.fixLink}
                    >
                      Open dates
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {compact && data.items.length > rows.length ? (
              <Link
                href={`/admin/availability?hotelId=${data.items[0].hotelId}&roomTypeId=${data.items[0].roomTypeId}`}
                className={styles.moreLink}
              >
                View all {data.items.length}
              </Link>
            ) : null}
          </>
        )}
      </div>
    </Panel>
  );
}

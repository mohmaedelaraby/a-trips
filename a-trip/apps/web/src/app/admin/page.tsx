'use client';

import * as React from 'react';
import Link from 'next/link';
import { useAdminDashboard } from '../../modules/admin-dashboard/hooks/use-dashboard';
import { useConfirmBooking, useRejectBooking } from '../../modules/bookings/hooks/use-admin-bookings';
import { useSession } from '../../modules/auth/hooks/use-auth';
import {
  AdminTopbar,
  Panel,
  PanelHead,
  Pill,
  adminUi as ui,
} from '../../modules/admin-dashboard/components/admin-ui';
import { Skeleton } from '../../shared/components/skeleton';
import { cn, formatPrice } from '../../shared/lib/utils';
import styles from './styles/admin-dashboard.module.css';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** "10–13 Sep" from two ISO dates. */
function dateRangeLabel(from: string, to: string) {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  const month = end.toLocaleDateString('en-GB', { month: 'short' });
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${end.getDate()} ${month}`;
  }
  const startLabel = start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return `${startLabel} – ${end.getDate()} ${month}`;
}

function StatCard({
  label,
  value,
  hint,
  hintTone = 'muted',
  highlight = false,
}: {
  label: string;
  value: string | number;
  hint?: string;
  hintTone?: 'muted' | 'danger' | 'success';
  highlight?: boolean;
}) {
  return (
    <div className={cn(styles.stat, highlight && styles.statHighlight)}>
      <p className={cn(styles.statLabel, highlight && styles.statLabelHighlight)}>{label}</p>
      <p className={styles.statValue}>{value}</p>
      {hint ? (
        <p
          className={cn(
            styles.statHint,
            hintTone === 'danger' && styles.statHintDanger,
            hintTone === 'success' && styles.statHintSuccess,
          )}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export default function AdminDashboardPage() {
  const query = useAdminDashboard();
  const confirm = useConfirmBooking();
  const reject = useRejectBooking();
  const { user } = useSession();
  const [search, setSearch] = React.useState('');
  const stats = query.data;

  const pendingQueue = React.useMemo(
    () => stats?.recentBookings.filter((booking) => booking.status === 'PENDING_CONFIRMATION') ?? [],
    [stats],
  );

  const weekChange = stats?.bookingsWeekChangePercent;

  return (
    <>
      <AdminTopbar title={`${greeting()}${user ? `, ${user.name.split(' ')[0]}` : ''}`}>
        <input
          type="search"
          className={ui.search}
          placeholder="Search hotels, bookings, refs…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search"
        />
        <Link href="/admin/hotels/new" className={cn(ui.btn, ui.btnPrimary)}>
          + Add hotel
        </Link>
      </AdminTopbar>

      <div className={ui.body}>
        {query.isLoading && !stats ? (
          <div className={styles.skeletonGrid}>
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        ) : !stats ? (
          <Panel>
            <p className={ui.emptyRow}>Dashboard data is unavailable right now.</p>
          </Panel>
        ) : (
          <>
            <div className={styles.stats}>
              <StatCard
                label="Published hotels"
                value={stats.publishedHotels}
                hint={`${stats.draftHotels} in draft`}
              />
              <StatCard
                label="Pending bookings"
                value={stats.pendingBookings}
                hint={
                  stats.pendingOlderThan12h > 0
                    ? `${stats.pendingOlderThan12h} older than 12 hours`
                    : 'All within the 24h window'
                }
                hintTone={stats.pendingOlderThan12h > 0 ? 'danger' : 'muted'}
                highlight={stats.pendingBookings > 0}
              />
              <StatCard
                label="Bookings this week"
                value={stats.bookingsThisWeek}
                hint={
                  weekChange === null || weekChange === undefined
                    ? `${formatPrice(stats.revenueThisWeek, true)} requested value`
                    : `${weekChange >= 0 ? '+' : ''}${weekChange}% vs last week`
                }
                hintTone={weekChange !== null && weekChange !== undefined && weekChange >= 0 ? 'success' : 'danger'}
              />
              <StatCard
                label="Room nights sold"
                value={stats.roomNightsSold}
                hint={`${formatPrice(stats.roomNightsValue, true)} value`}
              />
            </div>

            <div className={styles.layout}>
              <Panel>
                <PanelHead title="Needs your action" hint="Oldest first · confirm or reject within 24h">
                  <Link href="/admin/bookings" className={ui.panelLink}>
                    All bookings →
                  </Link>
                </PanelHead>

                {pendingQueue.length === 0 ? (
                  <p className={ui.emptyRow}>Nothing pending — new requests will show up here.</p>
                ) : (
                  <div className={ui.tableWrap}>
                    <table className={ui.table}>
                      <thead>
                        <tr>
                          <th>Ref</th>
                          <th>Guest</th>
                          <th>Hotel</th>
                          <th>Dates</th>
                          <th>Total</th>
                          <th className={ui.numeric}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingQueue.map((booking, index) => (
                          <tr key={booking.id} className={cn(index % 2 === 1 && ui.rowHighlight)}>
                            <td className={ui.cellRef}>{booking.bookingReference}</td>
                            <td className={ui.cellStrong}>{booking.guestName}</td>
                            <td>{booking.hotelName}</td>
                            <td>{dateRangeLabel(booking.checkInDate, booking.checkOutDate)}</td>
                            <td className={ui.cellStrong}>{formatPrice(booking.totalPrice, true)}</td>
                            <td>
                              <div className={styles.queueActions}>
                                <button
                                  type="button"
                                  className={styles.confirmBtn}
                                  disabled={confirm.isPending || reject.isPending}
                                  onClick={() => confirm.mutate({ id: booking.id })}
                                >
                                  Confirm
                                </button>
                                <button
                                  type="button"
                                  className={styles.rejectBtn}
                                  disabled={confirm.isPending || reject.isPending}
                                  onClick={() => reject.mutate({ id: booking.id })}
                                >
                                  Reject
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>

              <div className={styles.rail}>
                <Panel>
                  <div className={styles.railBody}>
                    <h2 className={styles.railTitle}>Low availability</h2>
                    {stats.lowAvailability.length === 0 ? (
                      <p className={styles.statHint}>Nothing running low in the next 30 days.</p>
                    ) : (
                      <div className={styles.lowList}>
                        {stats.lowAvailability.map((row) => (
                          <div key={`${row.hotelName}-${row.roomTypeName}-${row.from}`} className={styles.lowRow}>
                            <div>
                              <p className={styles.lowName}>
                                {row.hotelName} · {row.roomTypeName}
                              </p>
                              <p className={styles.lowMeta}>
                                {row.stopSell
                                  ? 'Stop sell'
                                  : `${row.unitsLeft} unit${row.unitsLeft === 1 ? '' : 's'} left`}
                                , {dateRangeLabel(row.from, row.to)}
                              </p>
                            </div>
                            <Pill tone={row.stopSell ? 'danger' : 'warning'}>
                              {row.stopSell ? 'Closed' : 'Low'}
                            </Pill>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Panel>

                <Panel>
                  <div className={styles.railBody}>
                    <h2 className={styles.railTitle}>Missing content</h2>
                    <div className={styles.missingList}>
                      <div className={styles.missingRow}>
                        <span>Hotels without photos</span>
                        <span className={styles.missingCount}>{stats.missingContent.hotelsWithoutPhotos}</span>
                      </div>
                      <div className={styles.missingRow}>
                        <span>Room types without price</span>
                        <span className={styles.missingCount}>{stats.missingContent.roomTypesWithoutPrice}</span>
                      </div>
                      <div className={styles.missingRow}>
                        <span>No availability past 30 Sep</span>
                        <span className={styles.missingCount}>
                          {stats.missingContent.noAvailabilityPast30Days}
                        </span>
                      </div>
                    </div>
                    <Link href="/admin/hotels" className={styles.reviewBtn}>
                      Review list
                    </Link>
                  </div>
                </Panel>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

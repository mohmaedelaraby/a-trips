'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import {
  useAdminBookings,
  useConfirmBooking,
  useRejectBooking,
  useSetBookingNote,
} from '../../../modules/bookings/hooks/use-admin-bookings';
import { useAdminHotels } from '../../../modules/hotels/hooks/use-admin-hotels';
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
import { cn, formatPrice, pluralize } from '../../../shared/lib/utils';
import type { Booking } from '../../../modules/bookings/interfaces/booking';
import type { BookingStatus } from '../../../shared/interfaces/api';
import styles from '../styles/admin-bookings.module.css';

const PAGE_SIZE = 5;

type TabValue = 'PENDING_CONFIRMATION' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED' | 'all';

const STATUS_TONE: Record<string, 'warning' | 'success' | 'danger' | 'neutral'> = {
  PENDING_CONFIRMATION: 'warning',
  CONFIRMED: 'success',
  REJECTED: 'danger',
  CANCELLED: 'neutral',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING_CONFIRMATION: 'Pending',
  CONFIRMED: 'Confirmed',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

function dateRangeLabel(from: string, to: string) {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  const month = end.toLocaleDateString('en-GB', { month: 'short' });
  if (start.getMonth() === end.getMonth()) return `${start.getDate()}–${end.getDate()} ${month}`;
  return `${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${end.getDate()} ${month}`;
}

function submittedAt(value: string) {
  const date = new Date(value);
  return `${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}, ${date.toLocaleTimeString(
    'en-GB',
    { hour: '2-digit', minute: '2-digit' },
  )}`;
}

function hoursSince(value: string) {
  return Math.floor((Date.now() - new Date(value).getTime()) / 3_600_000);
}

function agoLabel(value: string) {
  const hours = hoursSince(value);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function activityFor(booking: Booking) {
  const rows = [
    { label: 'Request submitted by guest', time: booking.createdAt, active: true },
    { label: 'Confirmation email sent to guest', time: booking.createdAt, active: false },
  ];
  if (booking.status !== 'PENDING_CONFIRMATION') {
    rows.push({
      label: `Booking ${STATUS_LABEL[booking.status].toLowerCase()}`,
      time: booking.updatedAt,
      active: false,
    });
  }
  return rows;
}

function toCsv(bookings: Booking[]) {
  const header = ['Reference', 'Guest', 'Email', 'Hotel', 'Room', 'Check-in', 'Check-out', 'Total', 'Status'];
  const rows = bookings.map((booking) => [
    booking.bookingReference,
    booking.guest?.name ?? '',
    booking.guest?.email ?? '',
    booking.hotel.name,
    booking.roomTypeName,
    booking.checkInDate,
    booking.checkOutDate,
    String(booking.totalPrice),
    booking.status,
  ]);
  return [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

export default function AdminBookingsPage() {
  const [tab, setTab] = React.useState<TabValue>('PENDING_CONFIRMATION');
  const [search, setSearch] = React.useState('');
  const [hotelId, setHotelId] = React.useState('');
  const [withinDays, setWithinDays] = React.useState('7');
  const [page, setPage] = React.useState(1);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [note, setNote] = React.useState('');

  const hotels = useAdminHotels({ pageSize: 100 });
  const dashboard = useAdminDashboard();
  const confirm = useConfirmBooking();
  const reject = useRejectBooking();
  const saveNote = useSetBookingNote();

  const query = useAdminBookings({
    status: tab === 'all' ? undefined : (tab as BookingStatus),
    hotelId: hotelId || undefined,
    guest: search || undefined,
    submittedWithinDays: withinDays ? Number(withinDays) : undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const bookings = query.data?.items ?? [];
  const meta = query.data?.meta;
  const selected = bookings.find((booking) => booking.id === selectedId) ?? null;

  // Load the stored note whenever a different booking is opened.
  React.useEffect(() => {
    setNote(selected?.adminNote ?? '');
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  const exportCsv = () => {
    const blob = new Blob([toCsv(bookings)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `atrips-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const rangeStart = meta && meta.total > 0 ? (meta.page - 1) * PAGE_SIZE + 1 : 0;
  const rangeEnd = meta ? Math.min(meta.page * PAGE_SIZE, meta.total) : 0;
  const pendingCount = dashboard.data?.pendingBookings;

  return (
    <>
      <AdminTopbar
        title="Bookings"
        meta={
          meta
            ? `${meta.total} total${pendingCount ? ` · ${pendingCount} pending` : ''}`
            : undefined
        }
      >
        <input
          type="search"
          className={ui.search}
          placeholder="Ref, guest or email"
          value={search}
          onChange={(event) => reset(setSearch)(event.target.value)}
          aria-label="Search bookings"
        />
        <button
          type="button"
          className={cn(ui.btn, ui.btnGhost)}
          onClick={exportCsv}
          disabled={bookings.length === 0}
        >
          Export CSV
        </button>
      </AdminTopbar>

      <div className={ui.body}>
        <div className={styles.filters}>
          <Segmented<TabValue>
            value={tab}
            onChange={reset(setTab)}
            options={[
              { value: 'PENDING_CONFIRMATION', label: 'Pending', count: pendingCount },
              { value: 'CONFIRMED', label: 'Confirmed' },
              { value: 'REJECTED', label: 'Rejected' },
              { value: 'CANCELLED', label: 'Cancelled' },
              { value: 'all', label: 'All' },
            ]}
          />

          <select
            className={ui.select}
            value={hotelId}
            onChange={(event) => reset(setHotelId)(event.target.value)}
            aria-label="Filter by hotel"
          >
            <option value="">Hotel: All</option>
            {hotels.data?.items.map((hotel) => (
              <option key={hotel.id} value={hotel.id}>
                {hotel.name}
              </option>
            ))}
          </select>

          <select
            className={ui.select}
            value={withinDays}
            onChange={(event) => reset(setWithinDays)(event.target.value)}
            aria-label="Filter by submitted date"
          >
            <option value="7">Submitted: Last 7 days</option>
            <option value="30">Submitted: Last 30 days</option>
            <option value="90">Submitted: Last 90 days</option>
            <option value="">Submitted: Any time</option>
          </select>
        </div>

        <div className={cn(styles.layout, selected && styles.layoutWithDrawer)}>
          <Panel>
            <div className={ui.tableWrap}>
              <table className={ui.table}>
                <thead>
                  <tr>
                    <th>Ref</th>
                    <th>Guest</th>
                    <th>Hotel · room</th>
                    <th>Dates</th>
                    <th>Submitted</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {query.isLoading && !query.data ? (
                    Array.from({ length: PAGE_SIZE }, (_, i) => (
                      <tr key={i}>
                        <td colSpan={7}>
                          <Skeleton className="h-8 w-full" />
                        </td>
                      </tr>
                    ))
                  ) : bookings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className={ui.emptyRow}>
                        No bookings match these filters.
                      </td>
                    </tr>
                  ) : (
                    bookings.map((booking) => {
                      const late =
                        booking.status === 'PENDING_CONFIRMATION' && hoursSince(booking.createdAt) >= 12;
                      return (
                        <tr
                          key={booking.id}
                          onClick={() => setSelectedId(booking.id)}
                          className={cn(styles.row, selectedId === booking.id && styles.rowSelected)}
                        >
                          <td className={ui.cellRef}>{booking.bookingReference}</td>
                          <td>
                            <p className={styles.guestName}>{booking.guest?.name ?? '—'}</p>
                            {booking.guest?.phone ? (
                              <p className={styles.guestPhone}>{booking.guest.phone}</p>
                            ) : null}
                          </td>
                          <td>
                            <p className={styles.hotelName}>{booking.hotel.name}</p>
                            <p className={styles.roomName}>{booking.roomTypeName}</p>
                          </td>
                          <td>
                            {dateRangeLabel(booking.checkInDate, booking.checkOutDate)}
                            <p className={styles.nights}>{pluralize(booking.nights, 'night')}</p>
                          </td>
                          <td>
                            {submittedAt(booking.createdAt)}
                            <p className={cn(styles.submittedAgo, late && styles.submittedLate)}>
                              {agoLabel(booking.createdAt)}
                            </p>
                          </td>
                          <td className={ui.cellStrong}>{formatPrice(booking.totalPrice, true)}</td>
                          <td>
                            <Pill tone={STATUS_TONE[booking.status] ?? 'neutral'} dot>
                              {STATUS_LABEL[booking.status] ?? booking.status}
                            </Pill>
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

          {selected ? (
            <div className={styles.drawer}>
              <div className={styles.drawerHead}>
                <div>
                  <p className={styles.drawerRef}>{selected.bookingReference}</p>
                  <p className={styles.drawerName}>{selected.guest?.name ?? 'Guest'}</p>
                </div>
                <button
                  type="button"
                  className={styles.closeBtn}
                  onClick={() => setSelectedId(null)}
                  aria-label="Close details"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className={styles.drawerBody}>
                {selected.status === 'PENDING_CONFIRMATION' ? (
                  <p className={styles.pendingBanner}>
                    <span className={styles.pendingBannerStrong}>
                      Pending {hoursSince(selected.createdAt)} hours.
                    </span>{' '}
                    Guest was told they&apos;d hear back within 24h —{' '}
                    {Math.max(0, 24 - hoursSince(selected.createdAt))} hours left.
                  </p>
                ) : null}

                <p className={styles.sectionLabel}>Booking</p>
                <div className={styles.detailRow}>
                  <span className={styles.detailKey}>Hotel</span>
                  <span className={styles.detailValue}>{selected.hotel.name}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailKey}>Room type</span>
                  <span className={styles.detailValue}>{selected.roomTypeName}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailKey}>Dates</span>
                  <span className={styles.detailValue}>
                    {dateRangeLabel(selected.checkInDate, selected.checkOutDate)} ·{' '}
                    {pluralize(selected.nights, 'night')}
                  </span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailKey}>Guests</span>
                  <span className={styles.detailValue}>
                    {pluralize(selected.numAdults, 'adult')}
                    {selected.numChildren
                      ? `, ${pluralize(selected.numChildren, 'child', 'children')}`
                      : ''}
                  </span>
                </div>
                <div className={styles.totalRow}>
                  <span>Total</span>
                  <span>{formatPrice(selected.totalPrice, true)}</span>
                </div>

                <p className={styles.sectionLabel}>Guest</p>
                <div className={styles.detailRow}>
                  <span className={styles.detailKey}>Email</span>
                  <span className={styles.detailValue}>{selected.guest?.email ?? '—'}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailKey}>Phone</span>
                  <span className={styles.detailValue}>{selected.guest?.phone ?? '—'}</span>
                </div>

                {selected.specialRequests ? (
                  <>
                    <p className={styles.sectionLabel}>Special requests</p>
                    <p className={styles.requestBox}>{selected.specialRequests}</p>
                  </>
                ) : null}

                <p className={styles.sectionLabel}>
                  Internal note <span className={styles.sectionLabelInline}>— not visible to guest</span>
                </p>
                <textarea
                  className={styles.noteArea}
                  placeholder="Called hotel, awaiting reply…"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  onBlur={() => {
                    if (note !== (selected.adminNote ?? '')) {
                      saveNote.mutate({ id: selected.id, adminNote: note });
                    }
                  }}
                />

                {selected.status === 'PENDING_CONFIRMATION' ? (
                  <>
                    <div className={styles.drawerActions}>
                      <button
                        type="button"
                        className={styles.confirmBtn}
                        disabled={confirm.isPending || reject.isPending}
                        onClick={() => confirm.mutate({ id: selected.id, adminNote: note || undefined })}
                      >
                        {confirm.isPending ? 'Confirming…' : 'Confirm booking'}
                      </button>
                      <button
                        type="button"
                        className={styles.rejectBtn}
                        disabled={confirm.isPending || reject.isPending}
                        onClick={() => {
                          const reason = window.prompt('Reason for rejection (saved as internal note)');
                          if (reason === null) return;
                          reject.mutate({ id: selected.id, adminNote: reason || note || undefined });
                        }}
                      >
                        Reject with reason
                      </button>
                    </div>
                    <p className={styles.drawerFootnote}>
                      Confirming emails the guest and decrements availability by 1 unit for{' '}
                      {dateRangeLabel(selected.checkInDate, selected.checkOutDate)}.
                    </p>
                  </>
                ) : null}

                <p className={styles.sectionLabel}>Activity</p>
                <div className={styles.activity}>
                  {activityFor(selected).map((row, index) => (
                    <div key={index} className={styles.activityRow}>
                      <span
                        className={cn(styles.activityDot, row.active && styles.activityDotActive)}
                        aria-hidden
                      />
                      <div>
                        <p className={styles.activityLabel}>{row.label}</p>
                        <p className={styles.activityTime}>{submittedAt(row.time)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

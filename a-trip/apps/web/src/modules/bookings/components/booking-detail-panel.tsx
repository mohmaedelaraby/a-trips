'use client';

import { Button } from '../../../shared/components/button';
import { formatDate, formatPrice, pluralize } from '../../../shared/lib/utils';
import { useCancelBooking } from '../hooks/use-bookings';
import type { Booking } from '../interfaces/booking';
import styles from '../styles/booking-detail-panel.module.css';

const STATUS_BLURB: Record<Booking['status'], string> = {
  PENDING_CONFIRMATION: 'Pending confirmation.',
  CONFIRMED: 'Confirmed.',
  REJECTED: 'Rejected.',
  CANCELLED: 'Cancelled.',
};

export function BookingDetailPanel({ booking }: { booking: Booking }) {
  const cancel = useCancelBooking();
  const canCancel = booking.status === 'PENDING_CONFIRMATION' || booking.status === 'CONFIRMED';

  return (
    <div className={styles.panel}>
      <div className={styles.headerRow}>
        <h2 className={styles.title}>Booking detail</h2>
        <span className={styles.reference}>{booking.bookingReference}</span>
      </div>

      <div className={styles.statusBlurb}>
        <span className={styles.statusBlurbStrong}>{STATUS_BLURB[booking.status]}</span>{' '}
        Submitted {formatDate(booking.createdAt, 'long')}.
      </div>

      <dl className={styles.rows}>
        <Row label="Hotel" value={booking.hotel.name} />
        <Row label="Room" value={booking.roomTypeName} />
        <Row label="Check-in" value={formatDate(booking.checkInDate)} />
        <Row label="Check-out" value={formatDate(booking.checkOutDate)} />
        <Row
          label="Guests"
          value={`${pluralize(booking.numAdults, 'adult')}${
            booking.numChildren > 0 ? `, ${pluralize(booking.numChildren, 'child', 'children')}` : ''
          }`}
        />
        {booking.specialRequests ? <Row label="Requests" value={booking.specialRequests} /> : null}
      </dl>

      <div className={styles.totalRow}>
        <span>Total</span>
        <span>{formatPrice(booking.totalPrice, true)}</span>
      </div>

      <div className={styles.actions}>
        <Button variant="outline" size="sm" block>
          Contact support
        </Button>
        {canCancel ? (
          <Button
            variant="outline"
            size="sm"
            block
            className={styles.cancelBtn}
            loading={cancel.isPending}
            onClick={() => cancel.mutate(booking.id)}
          >
            Cancel request
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.row}>
      <dt className={styles.rowLabel}>{label}</dt>
      <dd className={styles.rowValue}>{value}</dd>
    </div>
  );
}

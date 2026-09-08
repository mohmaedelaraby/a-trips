'use client';

import { Button } from '../../../shared/components/button';
import { formatDate, formatPrice } from '../../../shared/lib/utils';
import { useCancelBooking } from '../hooks/use-bookings';
import type { Booking } from '../interfaces/booking';
import { useTranslation } from '../../../shared/i18n/use-translation';
import styles from '../styles/booking-detail-panel.module.css';

const STATUS_BLURB: Record<Booking['status'], string> = {
  PENDING_PAYMENT: 'Awaiting payment — your room is held until you pay.',
  PENDING_CONFIRMATION: 'Paid. Pending confirmation.',
  CONFIRMED: 'Confirmed.',
  REJECTED: 'Rejected.',
  CANCELLED: 'Cancelled.',
  EXPIRED: 'The payment hold expired and the room was released. Nothing was charged.',
};

export function BookingDetailPanel({ booking }: { booking: Booking }) {
  const { t, tn } = useTranslation();
  const cancel = useCancelBooking();
  // An unpaid hold is cancellable too, so a guest can release it deliberately
  // instead of waiting out the timer.
  const canCancel =
    booking.status === 'PENDING_PAYMENT' ||
    booking.status === 'PENDING_CONFIRMATION' ||
    booking.status === 'CONFIRMED';

  return (
    <div className={styles.panel}>
      <div className={styles.headerRow}>
        <h2 className={styles.title}>{t('ui.booking.detail')}</h2>
        <span className={styles.reference}>{booking.bookingReference}</span>
      </div>

      <div className={styles.statusBlurb}>
        <span className={styles.statusBlurbStrong}>{STATUS_BLURB[booking.status]}</span>{' '}
        Submitted {formatDate(booking.createdAt, 'long')}.
      </div>

      <dl className={styles.rows}>
        <Row label={t('ui.booking.hotel')} value={booking.hotel.name} />
        <Row label={t('ui.common.room')} value={booking.roomTypeName} />
        <Row label={t('ui.common.checkIn')} value={formatDate(booking.checkInDate)} />
        <Row label={t('ui.common.checkOut')} value={formatDate(booking.checkOutDate)} />
        <Row
          label={t('ui.common.guests')}
          value={`${tn('ui.common.adults', booking.numAdults)}${
            booking.numChildren > 0 ? `, ${tn('ui.common.children', booking.numChildren)}` : ''
          }`}
        />
        {booking.specialRequests ? <Row label={t('ui.booking.requests')} value={booking.specialRequests} /> : null}
      </dl>

      <div className={styles.totalRow}>
        <span>{t('ui.common.total')}</span>
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

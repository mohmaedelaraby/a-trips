'use client';

import Image from 'next/image';
import { BookingStatusChip } from '../../../shared/components/status-chip';
import { formatDate, formatPrice, pluralize, cn } from '../../../shared/lib/utils';
import type { Booking } from '../interfaces/booking';
import styles from '../styles/booking-card.module.css';

export function BookingCard({
  booking,
  active,
  onSelect,
}: {
  booking: Booking;
  active?: boolean;
  onSelect: () => void;
}) {
  const muted = booking.status === 'REJECTED' || booking.status === 'CANCELLED';

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(styles.card, active ? styles.cardActive : styles.cardInactive)}
    >
      <div className={styles.thumb}>
        {booking.hotel.imageUrl ? (
          <Image src={booking.hotel.imageUrl} alt={booking.hotel.name} fill sizes="80px" className={styles.thumbImage} />
        ) : null}
      </div>

      <div className={styles.main}>
        <div className={styles.topRow}>
          <BookingStatusChip status={booking.status} />
          <span className={styles.reference}>{booking.bookingReference}</span>
        </div>
        <p className={cn(styles.hotelName, muted ? styles.hotelNameMuted : styles.hotelNameDefault)}>
          {booking.hotel.name}
        </p>
        <p className={styles.meta}>
          {booking.roomTypeName} · {formatDate(booking.checkInDate)}–{formatDate(booking.checkOutDate)} ·{' '}
          {pluralize(booking.numAdults, 'adult')}
        </p>
        {booking.adminNote ? <p className={styles.note}>{booking.adminNote}</p> : null}
      </div>

      <div className={styles.priceCol}>
        <span className={cn(styles.price, muted ? styles.priceMuted : styles.priceDefault)}>
          {formatPrice(booking.totalPrice, true)}
        </span>
        <span className={styles.action}>{booking.status === 'REJECTED' ? 'Find similar →' : 'View details →'}</span>
      </div>
    </button>
  );
}

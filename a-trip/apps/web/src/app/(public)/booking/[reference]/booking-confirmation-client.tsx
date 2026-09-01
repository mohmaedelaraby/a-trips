'use client';

import Link from 'next/link';
import { Check } from 'lucide-react';
import { useBookingByReference } from '../../../../modules/bookings/hooks/use-bookings';
import { Button } from '../../../../shared/components/button';
import { Skeleton } from '../../../../shared/components/skeleton';
import { EmptyState } from '../../../../shared/components/empty-state';
import { Logo } from '../../../../shared/components/logo';
import { formatDate, formatPrice, pluralize, cn } from '../../../../shared/lib/utils';
import styles from '../../styles/booking-confirmation.module.css';

export function BookingConfirmationClient({ reference }: { reference: string }) {
  const query = useBookingByReference(reference);

  return (
    <div>
      <header className={styles.header}>
        <div className="container-page">
          <Logo inverted />
        </div>
      </header>

      {query.isLoading ? (
        <div className={`container-page ${styles.narrow} ${styles.loadingWrap}`}>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : query.isError || !query.data ? (
        <div className={`container-page ${styles.stateWrap}`}>
          <EmptyState title="Booking not found" description={`We could not find a booking with reference ${reference}.`} />
        </div>
      ) : (
        <BookingSummary booking={query.data} leadGuestFirstName={query.data.guest?.name.split(' ')[0] ?? 'there'} />
      )}
    </div>
  );
}

function BookingSummary({
  booking,
  leadGuestFirstName,
}: {
  booking: NonNullable<ReturnType<typeof useBookingByReference>['data']>;
  leadGuestFirstName: string;
}) {
  const isPending = booking.status === 'PENDING_CONFIRMATION';

  return (
    <div className={`container-page ${styles.narrow} ${styles.summaryWrap}`}>
      <div className={styles.hero}>
        <div className={styles.iconCircle}>
          <Check className="h-7 w-7" strokeWidth={3} />
        </div>
        <h1 className={styles.heroTitle}>Request received, {leadGuestFirstName}</h1>
        <p className={styles.heroBody}>
          {booking.guest?.email ? (
            <>
              We&apos;ve emailed a copy to {booking.guest.email}. Our team confirms with the hotel within 24 hours.
            </>
          ) : (
            'Our team confirms with the hotel within 24 hours.'
          )}
        </p>
      </div>

      <div className={styles.metaGrid}>
        <div className={styles.metaCard}>
          <p className={styles.metaLabel}>Booking reference</p>
          <p className={styles.metaValue}>{booking.bookingReference}</p>
        </div>
        <div className={styles.metaCard}>
          <p className={styles.metaLabel}>Status</p>
          <p>
            <span className={cn(styles.statusChip, isPending ? styles.statusPending : styles.statusConfirmed)}>
              <span className={styles.statusDot} />
              {isPending ? 'Pending confirmation' : 'Confirmed'}
            </span>
          </p>
        </div>
      </div>

      <div className={styles.detailCard}>
        <div className={styles.detailHead}>
          <div>
            <p className={styles.hotelName}>{booking.hotel.name}</p>
            <p className={styles.hotelMeta}>
              {booking.roomTypeName} · {booking.hotel.city}, {booking.hotel.country}
            </p>
          </div>
          {booking.hotel.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={booking.hotel.imageUrl} alt={booking.hotel.name} className={styles.hotelImage} />
          ) : (
            <div className={styles.hotelImagePlaceholder} />
          )}
        </div>

        <div className={styles.detailRow}>
          <span className={styles.detailRowLabel}>Dates</span>
          <span className={styles.detailRowValue}>
            {formatDate(booking.checkInDate)} — {formatDate(booking.checkOutDate)} · {pluralize(booking.nights, 'night')}
          </span>
        </div>
        <div className={styles.detailRowPlain}>
          <span className={styles.detailRowLabel}>Guests</span>
          <span className={styles.detailRowValue}>
            {pluralize(booking.numAdults, 'adult')}
            {booking.numChildren > 0 ? `, ${pluralize(booking.numChildren, 'child', 'children')}` : ''} · 1 room
          </span>
        </div>

        <div className={styles.totalRow}>
          <span>Total</span>
          <span>{formatPrice(booking.totalPrice, true)}</span>
        </div>
      </div>

      <div className={styles.actions}>
        <Button asChild variant="primary" block>
          <Link href="/account/bookings">View my bookings</Link>
        </Button>
        <Button asChild variant="outline" block>
          <Link href="/hotels">Back to hotels</Link>
        </Button>
      </div>
      <p className={styles.footnote}>Questions? Call +20 100 000 0000 or reply to the email.</p>
    </div>
  );
}

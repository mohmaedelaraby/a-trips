'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { useHotelDetail } from '../../../modules/hotels/hooks/use-hotels';
import { CheckoutForm } from '../../../modules/bookings/components/checkout-form';
import { PaymentStep } from '../../../modules/bookings/components/payment-step';
import { Skeleton } from '../../../shared/components/skeleton';
import { EmptyState } from '../../../shared/components/empty-state';
import { CheckoutStepper } from '../../../modules/bookings/components/checkout-stepper';
import type { Booking } from '../../../modules/bookings/interfaces/booking';
import { useTranslation } from '../../../shared/i18n/use-translation';
import styles from '../styles/checkout.module.css';

export function CheckoutClient() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  // Set once the booking exists and is holding rooms; from then on the page
  // shows payment and must not fall back to the details form.
  const [heldBooking, setHeldBooking] = React.useState<Booking | null>(null);
  const roomTypeId = searchParams.get('roomTypeId');
  const checkIn = searchParams.get('checkIn') ?? undefined;
  const checkOut = searchParams.get('checkOut') ?? undefined;
  const adults = Number(searchParams.get('adults') ?? '2');
  const childrenCount = Number(searchParams.get('children') ?? '0');
  const hotelSlug = searchParams.get('hotelSlug') ?? '';

  const detailQuery = useHotelDetail(hotelSlug, {
    checkIn,
    checkOut,
    adults,
    children: childrenCount,
  });

  // Checked before every other branch: once the rooms are held, the hotel query
  // reports them as unavailable, and those branches would wrongly bounce the
  // guest out of a checkout they are midway through paying for.
  if (heldBooking) {
    return (
      <div>
        <CheckoutStepper step={2} />
        <div className={`container-page ${styles.formWrap}`}>
          <PaymentStep booking={heldBooking} />
        </div>
      </div>
    );
  }

  if (!roomTypeId || !checkIn || !checkOut || !hotelSlug) {
    return (
      <div>
        <CheckoutStepper step={1} />
        <div className={`container-page ${styles.stateWrap}`}>
          <EmptyState
            title={t('ui.checkout.missingDetails')}
            description={t('ui.checkout.missingDetailsHint')}
          />
        </div>
      </div>
    );
  }

  if (detailQuery.isLoading) {
    return (
      <div>
        <CheckoutStepper step={1} />
        <div className={`container-page ${styles.loadingWrap}`}>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  const hotel = detailQuery.data;
  const roomType = hotel?.roomTypes.find((rt) => rt.id === roomTypeId);

  if (!hotel || !roomType) {
    return (
      <div>
        <CheckoutStepper step={1} />
        <div className={`container-page ${styles.stateWrap}`}>
          <EmptyState
            title={t('ui.checkout.roomNotFound')}
            description={t('ui.checkout.roomNotFoundHint')}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <CheckoutStepper step={1} />
      <div className={`container-page ${styles.formWrap}`}>
        <CheckoutForm
          hotel={hotel}
          roomType={roomType}
          checkIn={checkIn}
          checkOut={checkOut}
          adults={adults}
          children={childrenCount}
          onBookingHeld={setHeldBooking}
        />
      </div>
    </div>
  );
}

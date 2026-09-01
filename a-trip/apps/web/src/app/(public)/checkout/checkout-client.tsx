'use client';

import { useSearchParams } from 'next/navigation';
import { useHotelDetail } from '../../../modules/hotels/hooks/use-hotels';
import { CheckoutForm } from '../../../modules/bookings/components/checkout-form';
import { Skeleton } from '../../../shared/components/skeleton';
import { EmptyState } from '../../../shared/components/empty-state';
import { CheckoutStepper } from '../../../modules/bookings/components/checkout-stepper';
import styles from '../styles/checkout.module.css';

export function CheckoutClient() {
  const searchParams = useSearchParams();
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

  if (!roomTypeId || !checkIn || !checkOut || !hotelSlug) {
    return (
      <div>
        <CheckoutStepper step={1} />
        <div className={`container-page ${styles.stateWrap}`}>
          <EmptyState
            title="Missing booking details"
            description="Head back to a hotel page and choose your room and dates again."
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
          <EmptyState title="We could not find that room" description="Please choose your room again from the hotel page." />
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
        />
      </div>
    </div>
  );
}

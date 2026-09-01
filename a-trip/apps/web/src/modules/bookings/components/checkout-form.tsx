'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Info } from 'lucide-react';
import { Button } from '../../../shared/components/button';
import { Checkbox, Field, Input, Textarea } from '../../../shared/components/form-controls';
import { RatingStars } from '../../../shared/components/rating-stars';
import { formatDate, formatPrice, pluralize } from '../../../shared/lib/utils';
import { ApiError } from '../../../shared/lib/api-client';
import { useSession } from '../../auth/hooks/use-auth';
import { useCreateBooking } from '../hooks/use-bookings';
import type { HotelDetail, RoomTypeWithAvailability } from '../../hotels/interfaces/hotel';
import styles from '../styles/checkout-form.module.css';

export function CheckoutForm({
  hotel,
  roomType,
  checkIn,
  checkOut,
  adults,
  children,
}: {
  hotel: HotelDetail;
  roomType: RoomTypeWithAvailability;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
}) {
  const router = useRouter();
  const { user, isAuthenticated, hydrated } = useSession();
  const createBooking = useCreateBooking();
  const [error, setError] = React.useState<string | null>(null);
  const [specialRequests, setSpecialRequests] = React.useState('');
  const [agreed, setAgreed] = React.useState(false);

  const [firstName, lastName] = React.useMemo(() => {
    const parts = (user?.name ?? '').trim().split(' ');
    return [parts[0] ?? '', parts.slice(1).join(' ')];
  }, [user?.name]);

  const availability = roomType.availability;
  const nights = availability?.nights ?? 0;
  const total = availability?.totalPrice ?? 0;
  const primaryImage = hotel.images.find((i) => i.isPrimary) ?? hotel.images[0];
  const taxesAndFees = Math.round((availability?.averageNightlyPrice ?? 0) * nights * 0.1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const booking = await createBooking.mutateAsync({
        roomTypeId: roomType.id,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        numAdults: adults,
        numChildren: children,
        specialRequests: specialRequests.trim() || undefined,
      });
      router.push(`/booking/${booking.bookingReference}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong, please try again.');
    }
  };

  if (hydrated && !isAuthenticated) {
    return (
      <div className={styles.gate}>
        <p className={styles.gateTitle}>Sign in to complete this booking</p>
        <p className={styles.gateBody}>
          Your reservation details are saved — just sign in or create an account to continue.
        </p>
        <div className={styles.gateActions}>
          <Button asChild variant="outline">
            <a href={`/sign-in?next=${encodeURIComponent(window.location.pathname + window.location.search)}`}>
              Sign in
            </a>
          </Button>
          <Button asChild>
            <a href={`/register?next=${encodeURIComponent(window.location.pathname + window.location.search)}`}>
              Create account
            </a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <div>
        <h1 className={styles.heading}>Almost there</h1>
        <p className={styles.subheading}>We only need your contact details — no card required.</p>

        <div className={styles.infoBanner}>
          <Info className={styles.infoIcon} />
          <p>
            <strong>Your booking will be confirmed by our team within 24 hours.</strong> You&apos;ll get an
            email as soon as the hotel confirms. Nothing is charged until then.
          </p>
        </div>

        <form id="checkout-form" onSubmit={handleSubmit} className={styles.form}>
          <h2 className={styles.formTitle}>Lead guest</h2>
          <div className={styles.fieldGrid}>
            <Field label="First name" htmlFor="firstName" required>
              <Input id="firstName" defaultValue={firstName} required />
            </Field>
            <Field label="Last name" htmlFor="lastName" required>
              <Input id="lastName" defaultValue={lastName} required />
            </Field>
            <Field label="Email" htmlFor="email" required>
              <Input id="email" type="email" defaultValue={user?.email ?? ''} required />
            </Field>
            <Field label="Phone" htmlFor="phone">
              <Input id="phone" type="tel" defaultValue={user?.phone ?? ''} />
            </Field>
          </div>

          <div className={styles.requestsField}>
            <Field label="Special requests" htmlFor="specialRequests" hint="Optional">
              <Textarea
                id="specialRequests"
                rows={3}
                placeholder="Late check-in, high floor, twin beds…"
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
              />
            </Field>
          </div>

          <label className={styles.agreeRow}>
            <Checkbox
              checked={agreed}
              onCheckedChange={(v) => setAgreed(v === true)}
              className={styles.agreeCheckbox}
              required
            />
            I agree to the{' '}
            <a href="#" className={styles.termsLink}>
              booking terms
            </a>{' '}
            and understand this request is confirmed manually by ATrips.
          </label>

          {error ? <p className={styles.errorMsg}>{error}</p> : null}

          <Button
            type="submit"
            variant="accent"
            size="lg"
            block
            className={styles.mobileSubmit}
            loading={createBooking.isPending}
            disabled={!availability?.bookable || !agreed}
          >
            Submit booking request
          </Button>
        </form>
      </div>

      <div className={styles.summary}>
        <div className={styles.summaryHead}>
          {primaryImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={primaryImage.url} alt={hotel.name} className={styles.summaryImage} />
          ) : (
            <div className={styles.summaryImagePlaceholder} />
          )}
          <div className="min-w-0">
            <RatingStars stars={hotel.stars} />
            <p className={styles.summaryHotelName}>{hotel.name}</p>
            <p className={styles.summaryHotelLoc}>
              {hotel.city}
              {hotel.address ? `, ${hotel.address}` : ''}
            </p>
          </div>
        </div>

        <div className={styles.summarySection}>
          <div className={styles.summaryRow}>
            <span className={styles.summaryRowLabel}>Room</span>
            <span className={styles.summaryRowValue}>{roomType.name}</span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryRowLabel}>Check-in</span>
            <span className={styles.summaryRowValue}>{formatDate(checkIn)}, 14:00</span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryRowLabel}>Check-out</span>
            <span className={styles.summaryRowValue}>{formatDate(checkOut)}, 12:00</span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryRowLabel}>Nights</span>
            <span className={styles.summaryRowValue}>{nights}</span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryRowLabel}>Guests</span>
            <span className={styles.summaryRowValue}>
              {pluralize(adults, 'adult')}
              {children > 0 ? `, ${pluralize(children, 'child', 'children')}` : ''}
            </span>
          </div>
        </div>

        <div className={`${styles.summarySection} ${styles.summarySectionMuted}`}>
          <div className={styles.summaryRow}>
            <span>
              {formatPrice(availability?.averageNightlyPrice ?? roomType.basePrice)} × {pluralize(nights, 'night')}
            </span>
            <span>{formatPrice(total - taxesAndFees)}</span>
          </div>
          <div className={styles.summaryRow}>
            <span>Taxes &amp; city fee</span>
            <span>{formatPrice(taxesAndFees)}</span>
          </div>
        </div>

        <div className={styles.summaryTotal}>
          <span>Total due at hotel</span>
          <span>{formatPrice(total)}</span>
        </div>

        <Button
          type="submit"
          form="checkout-form"
          variant="accent"
          size="lg"
          block
          className={styles.desktopSubmit}
          loading={createBooking.isPending}
          disabled={!availability?.bookable || !agreed}
        >
          Submit booking request
        </Button>
        <p className={styles.footnote}>Free cancellation until 8 Sep. No card needed.</p>
      </div>
    </div>
  );
}

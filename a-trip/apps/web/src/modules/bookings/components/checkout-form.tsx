'use client';

import * as React from 'react';
import { Info } from 'lucide-react';
import { Button } from '../../../shared/components/button';
import { Checkbox, Field, Input, Textarea } from '../../../shared/components/form-controls';
import { RatingStars } from '../../../shared/components/rating-stars';
import { formatDate, formatPrice, pluralize } from '../../../shared/lib/utils';
import { ApiError } from '../../../shared/lib/api-client';
import { useSession } from '../../auth/hooks/use-auth';
import { useCreateBooking } from '../hooks/use-bookings';
import type { HotelDetail, RoomTypeWithAvailability } from '../../hotels/interfaces/hotel';
import type { Booking } from '../interfaces/booking';
import { useTranslation } from '../../../shared/i18n/use-translation';
import styles from '../styles/checkout-form.module.css';

export function CheckoutForm({
  hotel,
  roomType,
  checkIn,
  checkOut,
  adults,
  children,
  onBookingHeld,
}: {
  hotel: HotelDetail;
  roomType: RoomTypeWithAvailability;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  /** Called once the rooms are held; the parent then shows the payment step. */
  onBookingHeld: (booking: Booking) => void;
}) {
  const { t, tn } = useTranslation();
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
  const primaryImage = hotel.images.find((i) => i.isPrimary) ?? hotel.images[0];

  // Straight from the server, so this page and the hotel card cannot drift.
  const breakdown = availability?.priceBreakdown ?? null;
  const total = breakdown?.total ?? availability?.totalPrice ?? 0;
  const taxesAndFees = breakdown?.taxAmount ?? 0;
  const roomSubtotal = breakdown?.roomSubtotal ?? total - taxesAndFees;

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
      // The rooms are now held for the payment window; hand off to PayPal
      // rather than jumping straight to the confirmation page.
      onBookingHeld(booking);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong, please try again.');
    }
  };

  if (hydrated && !isAuthenticated) {
    return (
      <div className={styles.gate}>
        <p className={styles.gateTitle}>{t('ui.checkout.signInPrompt')}</p>
        <p className={styles.gateBody}>{t('ui.checkout.signInBody')}</p>
        <div className={styles.gateActions}>
          <Button asChild variant="outline">
            <a href={`/sign-in?next=${encodeURIComponent(window.location.pathname + window.location.search)}`}>
              {t('ui.common.signIn')}
            </a>
          </Button>
          <Button asChild>
            <a href={`/register?next=${encodeURIComponent(window.location.pathname + window.location.search)}`}>
              {t('ui.common.createAccount')}
            </a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <div>
        <h1 className={styles.heading}>{t('ui.checkout.title')}</h1>
        <p className={styles.subheading}>{t('ui.checkout.subtitle')}</p>

        <div className={styles.infoBanner}>
          <Info className={styles.infoIcon} />
          <p>
            <strong>{t('ui.checkout.holdNotice')}</strong> {t('ui.checkout.holdNoticeBody')}
          </p>
        </div>

        <form id="checkout-form" onSubmit={handleSubmit} className={styles.form}>
          <h2 className={styles.formTitle}>{t('ui.checkout.leadGuest')}</h2>
          <div className={styles.fieldGrid}>
            <Field label={t('ui.checkout.firstName')} htmlFor="firstName" required>
              <Input id="firstName" defaultValue={firstName} required />
            </Field>
            <Field label={t('ui.checkout.lastName')} htmlFor="lastName" required>
              <Input id="lastName" defaultValue={lastName} required />
            </Field>
            <Field label={t('ui.checkout.email')} htmlFor="email" required>
              <Input id="email" type="email" defaultValue={user?.email ?? ''} required />
            </Field>
            <Field label={t('ui.checkout.phone')} htmlFor="phone">
              <Input id="phone" type="tel" defaultValue={user?.phone ?? ''} />
            </Field>
          </div>

          <div className={styles.requestsField}>
            <Field label={t('ui.checkout.specialRequests')} htmlFor="specialRequests" hint={t('ui.checkout.optional')}>
              <Textarea
                id="specialRequests"
                rows={3}
                placeholder={t('ui.checkout.specialRequestsPlaceholder')}
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
            {t('ui.checkout.agree')}
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
            {t('ui.checkout.continueToPayment')}
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
            <span className={styles.summaryRowLabel}>{t('ui.common.room')}</span>
            <span className={styles.summaryRowValue}>{roomType.name}</span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryRowLabel}>{t('ui.common.checkIn')}</span>
            <span className={styles.summaryRowValue}>{formatDate(checkIn)}, 14:00</span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryRowLabel}>{t('ui.common.checkOut')}</span>
            <span className={styles.summaryRowValue}>{formatDate(checkOut)}, 12:00</span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryRowLabel}>Nights</span>
            <span className={styles.summaryRowValue}>{nights}</span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryRowLabel}>{t('ui.common.guests')}</span>
            <span className={styles.summaryRowValue}>
              {tn('ui.common.adults', adults)}
              {children > 0 ? `, ${tn('ui.common.children', children)}` : ''}
            </span>
          </div>
        </div>

        <div className={`${styles.summarySection} ${styles.summarySectionMuted}`}>
          <div className={styles.summaryRow}>
            <span>{t('ui.hotels.roomNights', { nights: tn('ui.common.nights', nights) })}</span>
            <span>{formatPrice(roomSubtotal)}</span>
          </div>
          <div className={styles.summaryRow}>
            <span>{t('ui.hotels.taxes')}</span>
            <span>{formatPrice(taxesAndFees)}</span>
          </div>
        </div>

        <div className={styles.summaryTotal}>
          {/* Was "Total due at hotel" — payment is taken by PayPal on the next
              step now, so that label promised the wrong thing. */}
          <span>{t('ui.common.total')}</span>
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

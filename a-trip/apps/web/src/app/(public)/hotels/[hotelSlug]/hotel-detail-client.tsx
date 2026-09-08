'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { MapPin, Wifi } from 'lucide-react';
import {
  useHotelDetail,
  useHotelUnavailableDates,
} from '../../../../modules/hotels/hooks/use-hotels';
import { RatingStars } from '../../../../shared/components/rating-stars';
import { Skeleton } from '../../../../shared/components/skeleton';
import { EmptyState } from '../../../../shared/components/empty-state';
import {
  DateRangePicker,
  type DateRangeValue,
} from '../../../../shared/components/date-range-picker';
import { GuestStepper, type GuestValue } from '../../../../shared/components/guest-stepper';
import { RoomTypeTable } from '../../../../modules/hotels/components/room-type-table';
import { Button } from '../../../../shared/components/button';
import { StatusChip } from '../../../../shared/components/status-chip';
import { ImageLightbox } from '../../../../shared/components/image-lightbox';
import { addDaysIso, formatPrice, cn, todayIso } from '../../../../shared/lib/utils';
import { useTranslation } from '../../../../shared/i18n/use-translation';
import styles from '../../styles/hotel-detail.module.css';

export function HotelDetailClient({ hotelSlug }: { hotelSlug: string }) {
  const { t, tn } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();

  const checkIn = searchParams.get('checkIn') ?? undefined;
  const checkOut = searchParams.get('checkOut') ?? undefined;
  const adults = Number(searchParams.get('adults') ?? '2');
  const childrenCount = Number(searchParams.get('children') ?? '0');

  const dates: DateRangeValue = { checkIn: checkIn ?? null, checkOut: checkOut ?? null };
  const guests: GuestValue = { adults, children: childrenCount };
  const [showFullDescription, setShowFullDescription] = React.useState(false);
  const [showAllAmenities, setShowAllAmenities] = React.useState(false);
  const [selectedRoomTypeId, setSelectedRoomTypeId] = React.useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null);

  const updateParams = (
    next: Partial<{
      checkIn: string | null;
      checkOut: string | null;
      adults: number;
      children: number;
    }>,
  ) => {
    const params = new URLSearchParams(searchParams.toString());
    const merged = {
      checkIn: next.checkIn !== undefined ? next.checkIn : (checkIn ?? null),
      checkOut: next.checkOut !== undefined ? next.checkOut : (checkOut ?? null),
      adults: next.adults ?? adults,
      children: next.children ?? childrenCount,
    };
    if (merged.checkIn) params.set('checkIn', merged.checkIn);
    else params.delete('checkIn');
    if (merged.checkOut) params.set('checkOut', merged.checkOut);
    else params.delete('checkOut');
    params.set('adults', String(merged.adults));
    if (merged.children) params.set('children', String(merged.children));
    else params.delete('children');
    router.replace(`/hotels/${hotelSlug}?${params.toString()}`, { scroll: false });
  };

  const query = useHotelDetail(hotelSlug, { checkIn, checkOut, adults, children: childrenCount });

  // A fixed year-long window from today, so the key stays stable while the guest
  // edits dates and the answer is served from cache instead of refetched.
  const calendarFrom = React.useMemo(() => todayIso(), []);
  const calendarTo = React.useMemo(() => addDaysIso(calendarFrom, 365), [calendarFrom]);
  const availability = useHotelUnavailableDates(hotelSlug, calendarFrom, calendarTo);
  const unavailableDates = availability.data?.unavailableDates;

  const hotel = query.data;
  const hasDates = Boolean(checkIn && checkOut);

  const selectedRoom = React.useMemo(() => {
    if (!hotel) return undefined;
    if (selectedRoomTypeId) return hotel.roomTypes.find((r) => r.id === selectedRoomTypeId);
    // Prefer a room that is actually bookable on these dates, but fall back to
    // the first one so the reservation card keeps its price and its date/guest
    // pickers when nothing is available. Dropping the card would strand the
    // guest with no way to change the very dates that emptied it.
    return hotel.roomTypes.find((r) => !hasDates || r.availability?.bookable) ?? hotel.roomTypes[0];
  }, [hotel, selectedRoomTypeId, hasDates]);

  // Only the very first load blanks the page — later date/guest changes keep the
  // previous hotel on screen while the new availability loads.
  if (query.isLoading && !hotel) {
    return (
      <div className="container-page py-8">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="mt-4 h-8 w-1/2" />
        <Skeleton className="mt-6 h-40 w-full" />
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="container-page py-16">
        <EmptyState
          title={t('ui.hotels.notFound')}
          description={t('ui.hotels.notFoundHint')}
        />
      </div>
    );
  }

  const gallery = hotel.images;
  const visibleAmenities = showAllAmenities ? hotel.amenities : hotel.amenities.slice(0, 6);
  const hiddenAmenities = Math.max(0, hotel.amenities.length - 6);

  const checkoutHref = selectedRoom
    ? `/checkout?${new URLSearchParams({
        roomTypeId: selectedRoom.id,
        hotelSlug,
        ...(checkIn ? { checkIn } : {}),
        ...(checkOut ? { checkOut } : {}),
        adults: String(adults),
        ...(childrenCount ? { children: String(childrenCount) } : {}),
      }).toString()}`
    : null;

  // Nothing to sell on the chosen dates. This is an ordinary outcome of a
  // search, not an error, so the card stays and only its pricing half changes.
  const soldOut = hasDates && Boolean(selectedRoom) && !selectedRoom?.availability?.bookable;
  const hasRooms = hotel.roomTypes.length > 0;

  const nights = selectedRoom?.availability?.nights ?? 0;
  // Sold-out dates carry no nightly rate, so fall back to the room's base price
  // to keep the card showing what this room normally costs.
  const nightly = hasDates
    ? (selectedRoom?.availability?.averageNightlyPrice ?? selectedRoom?.basePrice ?? null)
    : (selectedRoom?.basePrice ?? null);

  // The server owns the tax split. This page used to add 10% on top while
  // checkout presented the same 10% as included, so the two screens quoted
  // different totals for one stay and neither matched the amount charged.
  const breakdown = selectedRoom?.availability?.priceBreakdown ?? null;
  const subtotal = breakdown
    ? breakdown.roomSubtotal
    : nightly !== null && nights > 0
      ? nightly * nights
      : nightly;
  const taxesAndFees = breakdown?.taxAmount ?? null;
  const total = breakdown ? breakdown.total : subtotal;

  return (
    <div>
      <div className={`container-page ${styles.galleryWrap}`}>
        <div className={styles.gallery}>
          {gallery.slice(0, 2).map((image, i) => (
            <button
              key={image.id}
              type="button"
              className={cn(styles.galleryTile, i === 1 && styles.galleryTileHidden)}
              onClick={() => setLightboxIndex(i)}
              aria-label={`Open photo ${i + 1} of ${gallery.length}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt={hotel.name}
                className={i === 0 ? styles.galleryHero : styles.galleryImage}
              />
            </button>
          ))}
          {gallery.slice(2, 4).map((image, i) => (
            <button
              key={image.id}
              type="button"
              className={cn(styles.galleryTile, styles.galleryTileHidden)}
              onClick={() => setLightboxIndex(i + 2)}
              aria-label={`Open photo ${i + 3} of ${gallery.length}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.url} alt={hotel.name} className={styles.galleryImage} />
            </button>
          ))}
          {gallery[4] ? (
            <button
              type="button"
              className={cn(styles.galleryTile, styles.galleryTileHidden, styles.galleryMoreWrap)}
              onClick={() => setLightboxIndex(4)}
              aria-label={`Open photo 5 of ${gallery.length}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={gallery[4].url} alt={hotel.name} className={styles.galleryMoreImage} />
              {gallery.length > 5 ? (
                <div className={styles.galleryMoreLabel}>+ {gallery.length - 4} photos</div>
              ) : null}
            </button>
          ) : null}
          {gallery.length === 0 ? <div className={styles.galleryEmpty}>{t('ui.hotels.noPhotos')}</div> : null}
        </div>
      </div>

      <ImageLightbox
        images={gallery}
        index={lightboxIndex}
        onIndexChange={setLightboxIndex}
        onClose={() => setLightboxIndex(null)}
        alt={hotel.name}
      />

      <div className={`container-page ${styles.body}`}>
        <div className={styles.layout}>
          <div className={styles.main}>
            <h1 className={styles.name}>{hotel.name}</h1>
            <div className={styles.metaRow}>
              <RatingStars stars={hotel.stars} />
              <span className={styles.address}>
                <MapPin className="h-3.5 w-3.5" />
                {hotel.address}, {hotel.city}, {hotel.country}
              </span>
            </div>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{t('ui.hotels.aboutHotel')}</h2>
              {hotel.description ? (
                <p
                  className={cn(
                    styles.description,
                    !showFullDescription && styles.descriptionClamped,
                  )}
                >
                  {hotel.description}
                </p>
              ) : null}
              {hotel.description && hotel.description.length > 180 ? (
                <button
                  type="button"
                  onClick={() => setShowFullDescription((v) => !v)}
                  className={styles.linkBtn}
                >
                  {showFullDescription ? 'Show less' : 'Read full description'}
                </button>
              ) : null}
            </section>

            {hotel.amenities.length > 0 ? (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>{t('ui.hotels.amenities')}</h2>
                <div className={styles.amenityGrid}>
                  {visibleAmenities.map((amenity) => (
                    <div key={amenity} className={styles.amenityItem}>
                      <Wifi className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
                      {amenity}
                    </div>
                  ))}
                </div>
                {hiddenAmenities > 0 && !showAllAmenities ? (
                  <button
                    type="button"
                    onClick={() => setShowAllAmenities(true)}
                    className={styles.linkBtn}
                  >
                    + {hiddenAmenities} more amenities
                  </button>
                ) : null}
              </section>
            ) : null}

            <section className={styles.section}>
              <div className={styles.roomSectionHead}>
                <h2 className={styles.sectionTitle}>{t('ui.hotels.chooseRoom')}</h2>
                {hasDates ? (
                  <p className={styles.roomAvailability}>
                    Availability for {checkIn && checkOut ? `${checkIn} – ${checkOut}` : ''} ·{' '}
                    {tn('ui.common.adults', adults)}
                  </p>
                ) : null}
              </div>

              <div className={styles.roomFilters}>
                <div className={styles.roomFilterField}>
                  <DateRangePicker
                    value={dates}
                    onChange={(next) => updateParams(next)}
                    unavailableDates={unavailableDates}
                    bare
                  />
                </div>
                <div className={cn(styles.roomFilterField, styles.roomFilterFieldGuests)}>
                  <GuestStepper value={guests} onChange={(next) => updateParams(next)} bare />
                </div>
              </div>

              <div className={styles.roomTableWrap}>
                <RoomTypeTable
                  hotelId={hotel.id}
                  hotelSlug={hotel.slug}
                  roomTypes={hotel.roomTypes}
                  checkIn={checkIn}
                  checkOut={checkOut}
                  adults={adults}
                  children={childrenCount}
                  selectedRoomTypeId={selectedRoom?.id ?? null}
                  onSelect={(id) => setSelectedRoomTypeId(id)}
                />
              </div>
            </section>

            {hotel.latitude && hotel.longitude ? (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>{t('ui.hotels.location')}</h2>
                <div className={styles.mapBox}>
                  <span className={styles.mapPin}>{hotel.name}</span>
                </div>
              </section>
            ) : null}
          </div>

          <aside className={styles.aside}>
            {/* The card is the only place a guest can change dates and guests,
                so it always renders. Availability changes what is inside it,
                never whether it exists. */}
            <div className={styles.summaryCard}>
              <div className={styles.priceRow}>
                <p className={styles.price}>
                  {formatPrice(nightly)}
                  <span className={styles.priceUnit}> / night</span>
                </p>
                {soldOut ? null : <StatusChip tone="success">{t('ui.hotels.freeCancellation')}</StatusChip>}
              </div>

              <div className={styles.datesField}>
                <DateRangePicker
                  value={dates}
                  onChange={(next) => updateParams(next)}
                  className={styles.cardPicker}
                  unavailableDates={unavailableDates}
                  bare
                  split
                />
              </div>

              <div className={styles.guestsField}>
                <GuestStepper
                  value={guests}
                  onChange={(next) => updateParams(next)}
                  className={styles.cardPicker}
                  bare
                />
              </div>

              {!hasRooms ? (
                <p className={styles.noRooms}>
                  This hotel has no rooms listed yet. Please check back soon.
                </p>
              ) : soldOut ? (
                <>
                  <div className={styles.unavailableNotice} role="status">
                    <p className={styles.unavailableTitle}>{t('ui.hotels.soldOut')}</p>
                    <p className={styles.unavailableHint}>
                      {t('ui.hotels.soldOutHint', { city: hotel.city })}
                    </p>
                  </div>

                  <Button variant="outline" size="lg" block asChild className={styles.reserveBtn}>
                    <Link href={`/hotels?city=${encodeURIComponent(hotel.city)}`}>
                      See other hotels in {hotel.city}
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  {hasDates && subtotal !== null ? (
                    <div className={styles.priceBreakdown}>
                      {/* Room and tax are the two halves of the total, so the
                          rows add up. Labelling this "nightly × nights" would
                          not: that product is the gross, tax included. */}
                      <div className={styles.breakdownRow}>
                        <span>{t('ui.hotels.roomNights', { nights: tn('ui.common.nights', nights) })}</span>
                        <span>{formatPrice(subtotal)}</span>
                      </div>
                      <div className={styles.breakdownRow}>
                        <span>Taxes &amp; city fee</span>
                        <span>{formatPrice(taxesAndFees)}</span>
                      </div>
                      <div className={styles.breakdownRow}>
                        <span>ATrips booking fee</span>
                        <span className={styles.breakdownFree}>$0</span>
                      </div>
                    </div>
                  ) : null}

                  <div className={styles.totalRow}>
                    <span>{t('ui.common.total')}</span>
                    <span>{formatPrice(total)}</span>
                  </div>

                  <Button
                    asChild={Boolean(checkoutHref && hasDates)}
                    disabled={!checkoutHref || !hasDates}
                    variant="accent"
                    size="lg"
                    block
                    className={styles.reserveBtn}
                  >
                    {checkoutHref && hasDates ? (
                      <Link href={checkoutHref}>
                        {t('ui.hotels.reserve', { room: selectedRoom?.name ?? '' })}
                      </Link>
                    ) : (
                      <span>{t('ui.hotels.pickDates')}</span>
                    )}
                  </Button>
                  <p className={styles.reserveFootnote}>
                    No payment now. Our team confirms your booking within 24 hours.
                  </p>
                </>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

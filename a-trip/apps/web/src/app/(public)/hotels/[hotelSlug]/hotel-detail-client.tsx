'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { MapPin, Wifi } from 'lucide-react';
import { useHotelDetail } from '../../../../modules/hotels/hooks/use-hotels';
import { RatingStars } from '../../../../shared/components/rating-stars';
import { Skeleton } from '../../../../shared/components/skeleton';
import { EmptyState } from '../../../../shared/components/empty-state';
import { DateRangePicker, type DateRangeValue } from '../../../../shared/components/date-range-picker';
import { GuestStepper, type GuestValue } from '../../../../shared/components/guest-stepper';
import { RoomTypeTable } from '../../../../modules/hotels/components/room-type-table';
import { Button } from '../../../../shared/components/button';
import { StatusChip } from '../../../../shared/components/status-chip';
import { ImageLightbox } from '../../../../shared/components/image-lightbox';
import { formatPrice, pluralize, cn } from '../../../../shared/lib/utils';
import styles from '../../styles/hotel-detail.module.css';

export function HotelDetailClient({ hotelSlug }: { hotelSlug: string }) {
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

  const updateParams = (next: Partial<{ checkIn: string | null; checkOut: string | null; adults: number; children: number }>) => {
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

  const hotel = query.data;
  const hasDates = Boolean(checkIn && checkOut);

  const selectedRoom = React.useMemo(() => {
    if (!hotel) return undefined;
    if (selectedRoomTypeId) return hotel.roomTypes.find((r) => r.id === selectedRoomTypeId);
    return hotel.roomTypes.find((r) => !hasDates || r.availability?.bookable);
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
        <EmptyState title="Hotel not found" description="This hotel may have been unpublished or the link is incorrect." />
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

  const nights = selectedRoom?.availability?.nights ?? 0;
  const nightly = hasDates ? (selectedRoom?.availability?.averageNightlyPrice ?? null) : (selectedRoom?.basePrice ?? null);
  const subtotal = nightly !== null && nights > 0 ? nightly * nights : nightly;
  const taxesAndFees = subtotal !== null ? Math.round(subtotal * 0.1) : null;
  const total = subtotal !== null && taxesAndFees !== null ? subtotal + taxesAndFees : subtotal;

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
          {gallery.length === 0 ? <div className={styles.galleryEmpty}>No photos yet</div> : null}
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
              <h2 className={styles.sectionTitle}>About this hotel</h2>
              {hotel.description ? (
                <p className={cn(styles.description, !showFullDescription && styles.descriptionClamped)}>
                  {hotel.description}
                </p>
              ) : null}
              {hotel.description && hotel.description.length > 180 ? (
                <button type="button" onClick={() => setShowFullDescription((v) => !v)} className={styles.linkBtn}>
                  {showFullDescription ? 'Show less' : 'Read full description'}
                </button>
              ) : null}
            </section>

            {hotel.amenities.length > 0 ? (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Amenities</h2>
                <div className={styles.amenityGrid}>
                  {visibleAmenities.map((amenity) => (
                    <div key={amenity} className={styles.amenityItem}>
                      <Wifi className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
                      {amenity}
                    </div>
                  ))}
                </div>
                {hiddenAmenities > 0 && !showAllAmenities ? (
                  <button type="button" onClick={() => setShowAllAmenities(true)} className={styles.linkBtn}>
                    + {hiddenAmenities} more amenities
                  </button>
                ) : null}
              </section>
            ) : null}

            <section className={styles.section}>
              <div className={styles.roomSectionHead}>
                <h2 className={styles.sectionTitle}>Choose your room</h2>
                {hasDates ? (
                  <p className={styles.roomAvailability}>
                    Availability for {checkIn && checkOut ? `${checkIn} – ${checkOut}` : ''} · {pluralize(adults, 'adult')}
                  </p>
                ) : null}
              </div>

              <div className={styles.roomFilters}>
                <div className={styles.roomFilterField}>
                  <DateRangePicker value={dates} onChange={(next) => updateParams(next)} bare />
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
                <h2 className={styles.sectionTitle}>Location</h2>
                <div className={styles.mapBox}>
                  <span className={styles.mapPin}>{hotel.name}</span>
                </div>
              </section>
            ) : null}
          </div>

          <aside className={styles.aside}>
            <div className={styles.summaryCard}>
              {selectedRoom ? (
                <>
                  <div className={styles.priceRow}>
                    <p className={styles.price}>
                      {formatPrice(nightly)}
                      <span className={styles.priceUnit}> / night</span>
                    </p>
                    <StatusChip tone="success">Free cancellation</StatusChip>
                  </div>

                  <div className={styles.datesField}>
                    <DateRangePicker
                      value={dates}
                      onChange={(next) => updateParams(next)}
                      className={styles.cardPicker}
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

                  {hasDates && subtotal !== null ? (
                    <div className={styles.priceBreakdown}>
                      <div className={styles.breakdownRow}>
                        <span>
                          {formatPrice(nightly)} × {pluralize(nights, 'night')}
                        </span>
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
                    <span>Total</span>
                    <span>{formatPrice(total)}</span>
                  </div>

                  <Button
                    asChild={Boolean(checkoutHref && (!hasDates || selectedRoom.availability?.bookable))}
                    disabled={!checkoutHref || (hasDates && !selectedRoom.availability?.bookable)}
                    variant="accent"
                    size="lg"
                    block
                    className={styles.reserveBtn}
                  >
                    {checkoutHref && (!hasDates || selectedRoom.availability?.bookable) ? (
                      <Link href={checkoutHref}>Reserve {selectedRoom.name}</Link>
                    ) : (
                      <span>Pick your dates</span>
                    )}
                  </Button>
                  <p className={styles.reserveFootnote}>
                    No payment now. Our team confirms your booking within 24 hours.
                  </p>
                </>
              ) : (
                <p className={styles.noRooms}>No rooms available for these dates.</p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

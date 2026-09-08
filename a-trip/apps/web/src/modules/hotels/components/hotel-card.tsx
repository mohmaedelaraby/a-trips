'use client';

import Image from 'next/image';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { Card } from '../../../shared/components/card';
import { Button } from '../../../shared/components/button';
import { RatingStars } from '../../../shared/components/rating-stars';
import { StatusChip } from '../../../shared/components/status-chip';
import { formatPrice, pluralize } from '../../../shared/lib/utils';
import { cn } from '../../../shared/lib/utils';
import type { HotelListItem } from '../interfaces/hotel';
import { useTranslation } from '../../../shared/i18n/use-translation';
import styles from '../styles/hotel-card.module.css';

export function HotelCard({ hotel, searchQuery }: { hotel: HotelListItem; searchQuery: string }) {
  const { t } = useTranslation();
  const primaryImage = hotel.images.find((i) => i.isPrimary) ?? hotel.images[0];
  const soldOut = hotel.fromPrice === null;
  const href = `/hotels/${hotel.slug}${searchQuery}`;

  return (
    <Card className={styles.card}>
      <div className={styles.row}>
        <Link href={href} className={styles.imageLink}>
          {primaryImage ? (
            <Image
              src={primaryImage.url}
              alt={hotel.name}
              fill
              sizes="(min-width: 640px) 224px, 100vw"
              className={cn(styles.image, soldOut && styles.imageSoldOut)}
            />
          ) : (
            <div className={styles.noPhoto}>{t('ui.hotels.noPhoto')}</div>
          )}
        </Link>

        <div className={styles.body}>
          <div className={styles.main}>
            <div className={styles.ratingRow}>
              <RatingStars stars={hotel.stars} />
              <span className={styles.address}>
                {hotel.address}, {hotel.city}
              </span>
            </div>
            <Link href={href}>
              <h3 className={styles.name}>{hotel.name}</h3>
            </Link>
            {hotel.description ? <p className={styles.description}>{hotel.description}</p> : null}

            {hotel.amenities.length > 0 ? (
              <p className={styles.amenities}>
                {hotel.amenities
                  .slice(0, 5)
                  // The array is the English filter key; this map is the display text.
                  .map((amenity) => hotel.amenityLabels?.[amenity] ?? amenity)
                  .join('   ')}
              </p>
            ) : null}

            {soldOut ? (
              <StatusChip tone="danger" className="mt-3">
                Sold out for your dates
              </StatusChip>
            ) : (
              <p className={styles.roomTypeCount}>{pluralize(hotel.roomTypeCount, 'room type')}</p>
            )}
          </div>

          <div className={styles.priceBlock}>
            {soldOut ? (
              <>
                <p className={styles.priceLabel}>{t('ui.hotels.seeOtherDatesFor')}</p>
                <Button asChild variant="outline" size="sm">
                  <Link href={href}>{t('ui.hotels.seeOtherDates')}</Link>
                </Button>
              </>
            ) : (
              <>
                <div>
                  <p className={styles.priceLabel}>{hotel.nights > 1 ? `${hotel.nights} nights, from` : 'from'}</p>
                  <p className={styles.price}>{formatPrice(hotel.fromPrice)}</p>
                  <p className={styles.priceLabel}>{t('ui.hotels.perNight')}</p>
                </div>
                <Button asChild size="sm">
                  <Link href={href}>{t('ui.hotels.checkAvailability')}</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

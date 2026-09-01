import Image from 'next/image';
import Link from 'next/link';
import { Card } from '../../../shared/components/card';
import { RatingStars } from '../../../shared/components/rating-stars';
import { formatPrice } from '../../../shared/lib/utils';
import type { HotelListItem } from '../interfaces/hotel';
import styles from '../styles/featured-hotel-card.module.css';

export function FeaturedHotelCard({ hotel }: { hotel: HotelListItem }) {
  const primaryImage = hotel.images.find((i) => i.isPrimary) ?? hotel.images[0];

  return (
    <Card className={styles.card}>
      <Link href={`/hotels/${hotel.slug}`}>
        <div className={styles.imageWrap}>
          {primaryImage ? (
            <Image
              src={primaryImage.url}
              alt={hotel.name}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
              className={styles.image}
            />
          ) : null}
        </div>

        <div className={styles.body}>
          <div className={styles.ratingRow}>
            <RatingStars stars={hotel.stars} />
          </div>
          <h3 className={styles.name}>{hotel.name}</h3>
          <p className={styles.city}>{hotel.city}</p>
          <div className={styles.priceRow}>
            <span className={styles.priceLabel}>from</span>
            <span className={styles.price}>
              {hotel.fromPrice !== null ? formatPrice(hotel.fromPrice) : 'Sold out'}
            </span>
            {hotel.fromPrice !== null ? <span className={styles.priceLabel}>/night</span> : null}
          </div>
        </div>
      </Link>
    </Card>
  );
}

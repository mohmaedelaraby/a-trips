'use client';

import Link from 'next/link';
import { useCities } from '../hooks/use-hotels';
import { Skeleton } from '../../../shared/components/skeleton';
import { pluralize, cn } from '../../../shared/lib/utils';
import styles from '../styles/hotel-grids.module.css';

const CITY_IMAGES: Record<string, string> = {
  Cairo: 'https://images.unsplash.com/photo-1568084680786-a84f91d1153c?w=900&q=80',
  Hurghada: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=900&q=80',
  'Sharm El Sheikh': 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=900&q=80',
  Luxor: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=900&q=80',
  Alexandria: 'https://images.unsplash.com/photo-1568402102990-bc541580b59f?w=900&q=80',
  Aswan: 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=900&q=80',
};

export function BrowseByCity() {
  const query = useCities();

  if (query.isLoading) {
    return (
      <div className={styles.cityGrid}>
        <Skeleton className="col-span-2 row-span-2 h-64 w-full sm:h-full" />
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  const cities = query.data ?? [];
  if (cities.length === 0) return null;

  const [primary, ...rest] = cities;

  return (
    <div className={styles.cityGrid}>
      <CityTile city={primary} className={styles.tileBig} big />
      {rest.slice(0, 4).map((city) => (
        <CityTile key={city.value} city={city} className={styles.tile} />
      ))}
      {rest.length < 5 ? (
        <div className={styles.morePlaceholder}>
          <p className={styles.morePlaceholderTitle}>More cities</p>
          <p className={styles.morePlaceholderSub}>Coming soon</p>
        </div>
      ) : null}
    </div>
  );
}

function CityTile({
  city,
  className,
  big = false,
}: {
  city: { value: string; count: number };
  className?: string;
  big?: boolean;
}) {
  const image = CITY_IMAGES[city.value];
  return (
    <Link href={`/hotels?city=${encodeURIComponent(city.value)}`} className={cn(styles.tileLink, className)}>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt={city.value} className={styles.tileImage} />
      ) : (
        <div className={styles.tileFallback} />
      )}
      <div className={styles.tileOverlay} />
      <div className={styles.tileText}>
        <p className={cn(styles.tileName, big ? styles.tileNameBig : styles.tileNameSmall)}>{city.value}</p>
        <p className={styles.tileCount}>{pluralize(city.count, 'hotel')}</p>
      </div>
    </Link>
  );
}

'use client';

import { useHotelSearch } from '../hooks/use-hotels';
import { Skeleton } from '../../../shared/components/skeleton';
import { FeaturedHotelCard } from './featured-hotel-card';
import styles from '../styles/hotel-grids.module.css';

export function FeaturedHotels() {
  const query = useHotelSearch({ sort: 'recommended', page: 1, pageSize: 4 });

  if (query.isLoading) {
    return (
      <div className={styles.featuredGrid}>
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="aspect-[4/3] w-full" />
        ))}
      </div>
    );
  }

  if (!query.data || query.data.items.length === 0) return null;

  return (
    <div className={styles.featuredGrid}>
      {query.data.items.slice(0, 4).map((hotel) => (
        <FeaturedHotelCard key={hotel.id} hotel={hotel} />
      ))}
    </div>
  );
}

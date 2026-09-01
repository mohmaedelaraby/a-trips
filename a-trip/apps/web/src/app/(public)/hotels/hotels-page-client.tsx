'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SearchX, X } from 'lucide-react';
import { HotelSearchWidget } from '../../../modules/hotels/components/hotel-search-widget';
import { HotelFilterSidebar } from '../../../modules/hotels/components/hotel-filter-sidebar';
import { HotelSortBar } from '../../../modules/hotels/components/hotel-sort-bar';
import { HotelCard } from '../../../modules/hotels/components/hotel-card';
import { useHotelSearch } from '../../../modules/hotels/hooks/use-hotels';
import { Skeleton } from '../../../shared/components/skeleton';
import { Button } from '../../../shared/components/button';
import { formatDate, nightsBetween, pluralize } from '../../../shared/lib/utils';
import type { HotelSortKey } from '../../../modules/hotels/interfaces/hotel';
import styles from '../styles/hotels.module.css';

function useSyncedParam(name: string) {
  const searchParams = useSearchParams();
  return searchParams.get(name) ?? undefined;
}

export function HotelsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const city = useSyncedParam('city');
  const checkIn = useSyncedParam('checkIn');
  const checkOut = useSyncedParam('checkOut');
  const adults = useSyncedParam('adults');
  const childrenParam = useSyncedParam('children');
  const page = Number(useSyncedParam('page') ?? '1');

  const [minPrice, setMinPrice] = React.useState<number | null>(null);
  const [maxPrice, setMaxPrice] = React.useState<number | null>(null);
  const [stars, setStars] = React.useState<number[]>([]);
  const [amenities, setAmenities] = React.useState<string[]>([]);
  const [sort, setSort] = React.useState<HotelSortKey>('recommended');

  const sleeps = adults ? Number(adults) : 2;
  const setSleeps = (next: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('adults', String(next));
    router.push(`/hotels?${params.toString()}`);
  };

  const query = useHotelSearch({
    city,
    checkIn,
    checkOut,
    adults: adults ? Number(adults) : undefined,
    children: childrenParam ? Number(childrenParam) : undefined,
    minPrice: minPrice ?? undefined,
    maxPrice: maxPrice ?? undefined,
    stars: stars.length ? stars : undefined,
    amenities: amenities.length ? amenities : undefined,
    sort,
    page,
    pageSize: 10,
  });

  const searchQuerySuffix = React.useMemo(() => {
    const params = new URLSearchParams();
    if (checkIn) params.set('checkIn', checkIn);
    if (checkOut) params.set('checkOut', checkOut);
    if (adults) params.set('adults', adults);
    if (childrenParam) params.set('children', childrenParam);
    const str = params.toString();
    return str ? `?${str}` : '';
  }, [checkIn, checkOut, adults, childrenParam]);

  const goToPage = (nextPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(nextPage));
    router.push(`/hotels?${params.toString()}`);
  };

  const clearFilters = () => {
    setMinPrice(null);
    setMaxPrice(null);
    setStars([]);
    setAmenities([]);
  };

  const appliedChips: Array<{ key: string; label: string; onRemove: () => void }> = [
    ...(stars.length ? stars.map((s) => ({ key: `star-${s}`, label: `${s} stars`, onRemove: () => setStars(stars.filter((v) => v !== s)) })) : []),
    ...amenities.map((a) => ({ key: `amenity-${a}`, label: a, onRemove: () => setAmenities(amenities.filter((v) => v !== a)) })),
    ...(minPrice !== null || maxPrice !== null
      ? [
          {
            key: 'price',
            label: `$${minPrice ?? query.data?.facets.priceRange?.min ?? 0}–$${maxPrice ?? query.data?.facets.priceRange?.max ?? 500}`,
            onRemove: () => {
              setMinPrice(null);
              setMaxPrice(null);
            },
          },
        ]
      : []),
  ];

  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : null;
  const subtitleParts = [
    query.data ? pluralize(query.data.meta.total, 'property', 'properties') : null,
    checkIn && checkOut ? `${formatDate(checkIn)}–${formatDate(checkOut)}` : null,
    nights ? pluralize(nights, 'night') : null,
    adults ? pluralize(Number(adults), 'adult') : null,
  ].filter(Boolean);

  return (
    <div>
      <div className={styles.searchBar}>
        <div className="container-page">
          <HotelSearchWidget compact tone="dark" />
        </div>
      </div>

      <div className={`container-page ${styles.pageWrap}`}>
        <h1 className={styles.title}>Hotels{city ? ` in ${city}` : ''}</h1>
        {subtitleParts.length > 0 ? <p className={styles.subtitle}>{subtitleParts.join(' · ')}</p> : null}

        <div className={styles.layout}>
          <HotelFilterSidebar
            facets={query.data?.facets}
            value={{ minPrice, maxPrice, stars, amenities, sleeps }}
            onChange={(next) => {
              if ('minPrice' in next) setMinPrice(next.minPrice ?? null);
              if ('maxPrice' in next) setMaxPrice(next.maxPrice ?? null);
              if ('stars' in next) setStars(next.stars ?? []);
              if ('amenities' in next) setAmenities(next.amenities ?? []);
              if (typeof next.sleeps === 'number') setSleeps(next.sleeps);
            }}
            onClear={clearFilters}
          />

          <div className={styles.results}>
            <div className={styles.toolbar}>
              {appliedChips.length > 0 ? (
                <div className={styles.appliedChips}>
                  <span className={styles.appliedLabel}>Applied:</span>
                  {appliedChips.map((chip) => (
                    <button key={chip.key} type="button" onClick={chip.onRemove} className={styles.chip}>
                      {chip.label}
                      <X className="h-3 w-3" />
                    </button>
                  ))}
                </div>
              ) : (
                <span />
              )}

              <HotelSortBar total={query.data?.meta.total ?? 0} sort={sort} onSortChange={setSort} />
            </div>

            <div className={styles.resultList}>
              {query.isLoading ? (
                Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-48 w-full" />)
              ) : query.data && query.data.items.length > 0 ? (
                query.data.items.map((hotel) => (
                  <HotelCard key={hotel.id} hotel={hotel} searchQuery={searchQuerySuffix} />
                ))
              ) : (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>
                    <SearchX className="h-6 w-6" aria-hidden />
                  </div>
                  <p className={styles.emptyTitle}>No hotels match all your filters</p>
                  <p className={styles.emptyBody}>
                    Try widening your price range or removing an amenity. There are more hotels
                    {city ? ` in ${city}` : ''} for these dates without filters.
                  </p>
                  <div className={styles.emptyActions}>
                    <Button onClick={clearFilters}>Clear all filters</Button>
                    <Button variant="outline" onClick={() => router.push('/hotels')}>
                      Change dates
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {query.data && query.data.meta.totalPages > 1 ? (
              <div className={styles.pagination}>
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
                  Previous
                </Button>
                <span className={styles.pageInfo}>
                  Page {query.data.meta.page} of {query.data.meta.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= query.data.meta.totalPages}
                  onClick={() => goToPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

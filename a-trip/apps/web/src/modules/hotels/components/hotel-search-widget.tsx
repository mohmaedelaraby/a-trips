'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Input } from '../../../shared/components/form-controls';
import { Button } from '../../../shared/components/button';
import { DateRangePicker } from '../../../shared/components/date-range-picker';
import { GuestStepper } from '../../../shared/components/guest-stepper';
import { useSearchFiltersStore } from '../stores/search-filters.store';
import { cn } from '../../../shared/lib/utils';
import styles from '../styles/hotel-search-widget.module.css';

const POPULAR_CITIES = ['Hurghada', 'Sharm El Sheikh', 'Luxor', 'Alexandria'];

export function HotelSearchWidget({
  compact = false,
  tone = 'light',
}: {
  compact?: boolean;
  /** 'dark' renders the condensed on-brand bar used under the sticky header on results pages. */
  tone?: 'light' | 'dark';
}) {
  const router = useRouter();
  const { city, dates, guests, setCity, setDates, setGuests } = useSearchFiltersStore();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (city) params.set('city', city);
    if (dates.checkIn) params.set('checkIn', dates.checkIn);
    if (dates.checkOut) params.set('checkOut', dates.checkOut);
    params.set('adults', String(guests.adults));
    if (guests.children) params.set('children', String(guests.children));
    router.push(`/hotels?${params.toString()}`);
  };

  const dark = tone === 'dark';

  return (
    <div className={cn(dark && styles.wrapDark)}>
      <form
        onSubmit={handleSearch}
        className={cn(styles.form, dark ? styles.formDark : styles.formLight, compact && !dark && styles.formCompact)}
      >
        <div className={cn(styles.field, dark ? styles.fieldDestinationDark : styles.fieldDestination)}>
          <div className={cn(styles.destinationBox, dark ? styles.destinationBoxDark : styles.destinationBoxLight)}>
            <Search className={styles.searchIcon} aria-hidden />
            <div className={styles.destinationTextWrap}>
              <label htmlFor="search-city" className={styles.destinationLabel}>
                {dark ? 'Where' : 'Destination or hotel'}
              </label>
              <Input
                id="search-city"
                placeholder="City, e.g. Cairo"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={styles.destinationInput}
              />
            </div>
          </div>
        </div>

        <div className={cn(styles.field, dark && styles.fieldDatesDark)}>
          <div className={cn(dark && styles.darkFieldFillActive)}>
            <DateRangePicker value={dates} onChange={setDates} bare split={!compact && !dark} />
          </div>
        </div>

        <div className={cn(styles.field, styles.fieldGuests)}>
          <div className={cn(dark && styles.darkFieldFillActive)}>
            <GuestStepper value={guests} onChange={setGuests} bare />
          </div>
        </div>

        <div className={styles.submitWrap}>
          <Button
            type="submit"
            variant={dark ? 'accent' : 'primary'}
            size={compact || dark ? 'md' : 'lg'}
            block
            className={styles.submitBtn}
          >
            <Search className="h-4 w-4" />
            {dark ? 'Update search' : 'Search'}
          </Button>
        </div>
      </form>

      {!compact && !dark ? (
        <div className={styles.popularRow}>
          <span className={styles.popularLabel}>Popular:</span>
          {POPULAR_CITIES.map((c) => (
            <button key={c} type="button" onClick={() => setCity(c)} className={styles.popularChip}>
              {c}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

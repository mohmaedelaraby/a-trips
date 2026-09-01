'use client';

import * as React from 'react';
import { Minus, Plus } from 'lucide-react';
import { Checkbox, Label } from '../../../shared/components/form-controls';
import { cn } from '../../../shared/lib/utils';
import type { HotelFacets } from '../interfaces/hotel';
import styles from '../styles/hotel-filter-sidebar.module.css';

export interface HotelFilterState {
  minPrice: number | null;
  maxPrice: number | null;
  stars: number[];
  amenities: string[];
  sleeps: number;
}

function PriceRangeSlider({
  bounds,
  min,
  max,
  onChange,
}: {
  bounds: { min: number; max: number };
  min: number;
  max: number;
  onChange: (min: number, max: number) => void;
}) {
  const pct = (v: number) => ((v - bounds.min) / Math.max(1, bounds.max - bounds.min)) * 100;

  return (
    <div>
      <div className={styles.sliderTrack}>
        <div className={styles.sliderFill} style={{ left: `${pct(min)}%`, right: `${100 - pct(max)}%` }} />
        <input
          type="range"
          min={bounds.min}
          max={bounds.max}
          value={min}
          onChange={(e) => onChange(Math.min(Number(e.target.value), max - 1), max)}
          className={styles.rangeInput}
        />
        <input
          type="range"
          min={bounds.min}
          max={bounds.max}
          value={max}
          onChange={(e) => onChange(min, Math.max(Number(e.target.value), min + 1))}
          className={styles.rangeInput}
        />
      </div>
      <div className={styles.sliderValues}>
        <span className={styles.sliderValue}>${min}</span>
        <span className={styles.sliderValue}>${max}</span>
      </div>
    </div>
  );
}

export function HotelFilterSidebar({
  facets,
  value,
  onChange,
  onClear,
}: {
  facets?: HotelFacets;
  value: HotelFilterState;
  onChange: (next: Partial<HotelFilterState>) => void;
  onClear: () => void;
}) {
  const [showAllAmenities, setShowAllAmenities] = React.useState(false);
  const hasFilters =
    value.minPrice !== null || value.maxPrice !== null || value.stars.length > 0 || value.amenities.length > 0;

  const bounds = facets?.priceRange ?? { min: 0, max: 500 };
  const min = value.minPrice ?? bounds.min;
  const max = value.maxPrice ?? bounds.max;

  const visibleAmenities = facets ? (showAllAmenities ? facets.amenities : facets.amenities.slice(0, 6)) : [];
  const hiddenCount = facets ? Math.max(0, facets.amenities.length - 6) : 0;

  return (
    <aside className={styles.sidebar}>
      <div className={styles.headerRow}>
        <h2 className={styles.title}>Filters</h2>
        {hasFilters ? (
          <button type="button" onClick={onClear} className={styles.clearAll}>
            Clear all
          </button>
        ) : null}
      </div>

      <div>
        <Label className={styles.sectionLabel}>Price per night</Label>
        <PriceRangeSlider
          bounds={bounds}
          min={min}
          max={max}
          onChange={(nextMin, nextMax) => onChange({ minPrice: nextMin, maxPrice: nextMax })}
        />
      </div>

      <div>
        <Label className={styles.sectionLabel}>Star rating</Label>
        <div className={styles.starRow}>
          {[2, 3, 4, 5].map((star) => {
            const active = value.stars.includes(star);
            return (
              <button
                key={star}
                type="button"
                onClick={() => {
                  const next = active ? value.stars.filter((s) => s !== star) : [...value.stars, star];
                  onChange({ stars: next });
                }}
                className={cn(styles.starButton, active && styles.starButtonActive)}
              >
                {star}
              </button>
            );
          })}
        </div>
      </div>

      {facets && facets.amenities.length > 0 ? (
        <div>
          <Label className={styles.sectionLabel}>Amenities</Label>
          <div className={styles.amenityList}>
            {visibleAmenities.map((amenity) => (
              <label key={amenity.value} className={styles.amenityRow}>
                <Checkbox
                  checked={value.amenities.includes(amenity.value)}
                  onCheckedChange={() => {
                    const next = value.amenities.includes(amenity.value)
                      ? value.amenities.filter((a) => a !== amenity.value)
                      : [...value.amenities, amenity.value];
                    onChange({ amenities: next });
                  }}
                />
                <span className={styles.amenityLabel}>{amenity.value}</span>
                <span className={styles.amenityCount}>{amenity.count}</span>
              </label>
            ))}
          </div>
          {hiddenCount > 0 && !showAllAmenities ? (
            <button type="button" onClick={() => setShowAllAmenities(true)} className={styles.showMore}>
              Show {hiddenCount} more
            </button>
          ) : null}
        </div>
      ) : null}

      <div>
        <Label className={styles.sectionLabel}>Guest capacity</Label>
        <div className={styles.capacityRow}>
          <span className={styles.capacityLabel}>Sleeps at least</span>
          <div className={styles.capacityControls}>
            <button
              type="button"
              aria-label="Decrease guests"
              disabled={value.sleeps <= 1}
              onClick={() => onChange({ sleeps: Math.max(1, value.sleeps - 1) })}
              className={styles.capacityBtn}
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className={styles.capacityValue}>{value.sleeps}</span>
            <button
              type="button"
              aria-label="Increase guests"
              onClick={() => onChange({ sleeps: Math.min(12, value.sleeps + 1) })}
              className={cn(styles.capacityBtn, styles.capacityBtnPrimary)}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

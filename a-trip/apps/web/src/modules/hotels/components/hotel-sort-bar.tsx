import { cn } from '../../../shared/lib/utils';
import type { HotelSortKey } from '../interfaces/hotel';
import styles from '../styles/hotel-sort-bar.module.css';

const OPTIONS: Array<{ value: HotelSortKey; label: string }> = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'price_asc', label: 'Price ↑' },
  { value: 'price_desc', label: 'Price ↓' },
  { value: 'stars_desc', label: 'Stars' },
];

export function HotelSortBar({
  sort,
  onSortChange,
}: {
  total: number;
  sort: HotelSortKey;
  onSortChange: (sort: HotelSortKey) => void;
}) {
  return (
    <div className={styles.bar}>
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onSortChange(option.value)}
          className={cn(styles.option, sort === option.value && styles.optionActive)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

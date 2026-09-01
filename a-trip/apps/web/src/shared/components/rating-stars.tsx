import { Star } from 'lucide-react';
import { cn } from '../lib/utils';
import styles from '../styles/rating-stars.module.css';

export function RatingStars({ stars, className }: { stars: number; className?: string }) {
  return (
    <span className={cn(styles.stars, className)} aria-label={`${stars} star hotel`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(styles.star, i < stars ? styles.starFilled : styles.starEmpty)}
        />
      ))}
    </span>
  );
}

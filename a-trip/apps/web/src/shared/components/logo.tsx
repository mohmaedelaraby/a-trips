import Link from 'next/link';
import styles from '../styles/logo.module.css';
import { cn } from '../lib/utils';

export function Logo({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <Link
      href="/"
      className={cn(styles.logo, inverted ? styles.logoInverted : styles.logoDefault, className)}
    >
      ATrips<span className={styles.dot}>.</span>
    </Link>
  );
}

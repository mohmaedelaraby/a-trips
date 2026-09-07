import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarCheck, Compass, Hotel, MapPin } from 'lucide-react';
import { COMING_SOON_COPY } from '../../../shared/lib/coming-soon';
import styles from '../styles/coming-soon.module.css';

interface PageProps {
  searchParams: Promise<{ feature?: string | string[] }>;
}

const GENERIC = {
  title: 'Coming soon',
  description:
    'This part of ATrips is still being built. Hotels are fully live — search, compare and book them today.',
};

/**
 * `feature` comes from a query string, so anyone can put anything in it. Only
 * values we have written copy for are honoured — an unknown one falls back to
 * the generic page rather than echoing a stranger's text back as our heading.
 */
function copyFor(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const feature = raw?.trim();
  if (!feature) return { ...GENERIC, isGeneric: true };

  const known = COMING_SOON_COPY[feature];
  if (!known) return { ...GENERIC, isGeneric: true };

  return { ...known, isGeneric: false };
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { title, description, isGeneric } = copyFor((await searchParams).feature);
  return {
    title: isGeneric ? title : `${title} — coming soon`,
    description,
    // Nothing here is real content yet, so keep it out of search results.
    robots: { index: false, follow: true },
  };
}

const LIVE_NOW = [
  { icon: Hotel, label: 'Hotel search', hint: 'Filter by city, dates, guests and price' },
  { icon: CalendarCheck, label: 'Instant booking', hint: 'Live availability, confirmed in seconds' },
  { icon: MapPin, label: 'Egypt-wide', hint: 'Hand-picked stays, booked direct at local rates' },
];

export default async function ComingSoonPage({ searchParams }: PageProps) {
  const { title, description } = copyFor((await searchParams).feature);

  return (
    <div className={`container-page ${styles.page}`}>
      <section className={styles.hero}>
        <span className={styles.badge}>
          <Compass className={styles.badgeIcon} aria-hidden />
          Coming soon
        </span>

        <h1 className={styles.title}>{title}</h1>
        <p className={styles.description}>{description}</p>

        <div className={styles.actions}>
          <Link href="/hotels" className={styles.primaryAction}>
            Browse hotels
          </Link>
          <Link href="/" className={styles.secondaryAction}>
            Back to home
          </Link>
        </div>

        <p className={styles.note}>
          ATrips is shipping in phases. Hotels are live now — everything else follows.
        </p>
      </section>

      <section className={styles.liveNow} aria-labelledby="live-now-heading">
        <h2 id="live-now-heading" className={styles.liveNowHeading}>
          What you can do today
        </h2>
        <ul className={styles.liveNowList}>
          {LIVE_NOW.map((item) => (
            <li key={item.label} className={styles.liveNowItem}>
              <span className={styles.liveNowIconWrap}>
                <item.icon className={styles.liveNowIcon} aria-hidden />
              </span>
              <span className={styles.liveNowText}>
                <span className={styles.liveNowLabel}>{item.label}</span>
                <span className={styles.liveNowHint}>{item.hint}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

'use client';

import * as React from 'react';
import Link from 'next/link';
import { CalendarX2 } from 'lucide-react';
import { useMyBookings } from '../../../../modules/bookings/hooks/use-bookings';
import { BookingCard } from '../../../../modules/bookings/components/booking-card';
import { BookingDetailPanel } from '../../../../modules/bookings/components/booking-detail-panel';
import { Skeleton } from '../../../../shared/components/skeleton';
import { EmptyState } from '../../../../shared/components/empty-state';
import { Button } from '../../../../shared/components/button';
import { cn } from '../../../../shared/lib/utils';
import type { BookingStatus } from '../../../../shared/interfaces/api';
import styles from '../../styles/account.module.css';

type Tab = 'ALL' | BookingStatus;

const TABS: Array<{ value: Tab; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING_CONFIRMATION', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'CANCELLED', label: 'Past' },
];

export default function MyBookingsPage() {
  const query = useMyBookings();
  const [tab, setTab] = React.useState<Tab>('ALL');
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const items = query.data?.items ?? [];
  const filtered =
    tab === 'ALL'
      ? items
      : tab === 'CANCELLED'
        ? items.filter((b) => b.status === 'CANCELLED' || b.status === 'REJECTED')
        : items.filter((b) => b.status === tab);

  const selected = filtered.find((b) => b.id === selectedId) ?? filtered[0] ?? null;

  return (
    <div>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>My bookings</h1>
          <p className={styles.subtitle}>{pluralizeCount(items.length)}</p>
        </div>

        <div className={styles.tabs}>
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={cn(styles.tab, tab === t.value && styles.tabActive)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.list}>
          {query.isLoading ? (
            Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-24 w-full" />)
          ) : filtered.length > 0 ? (
            filtered.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                active={selected?.id === booking.id}
                onSelect={() => setSelectedId(booking.id)}
              />
            ))
          ) : (
            <EmptyState
              icon={CalendarX2}
              title="No bookings yet"
              description="Once you request a room, it will show up here with its confirmation status."
              action={
                <Button asChild>
                  <Link href="/hotels">Browse hotels</Link>
                </Button>
              }
            />
          )}
        </div>

        {selected ? (
          <div className={styles.detailSticky}>
            <BookingDetailPanel booking={selected} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function pluralizeCount(n: number): string {
  return `${n} ${n === 1 ? 'booking' : 'bookings'}`;
}

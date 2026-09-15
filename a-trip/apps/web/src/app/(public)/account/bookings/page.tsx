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
import { useTranslation } from '../../../../shared/i18n/use-translation';
import styles from '../../styles/account.module.css';

type Tab = 'ALL' | BookingStatus;

const TABS: Array<{ value: Tab; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING_CONFIRMATION', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'CANCELLED', label: 'Past' },
];

export default function MyBookingsPage() {
  const { t } = useTranslation();
  const query = useMyBookings();
  const [tab, setTab] = React.useState<Tab>('ALL');
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const items = query.data?.items ?? [];
  const matchesTab = React.useCallback(
    (booking: (typeof items)[number], value: Tab) =>
      value === 'ALL'
        ? true
        : value === 'CANCELLED'
          ? booking.status === 'CANCELLED' || booking.status === 'REJECTED'
          : booking.status === value,
    [],
  );
  const filtered = items.filter((booking) => matchesTab(booking, tab));
  const countFor = (value: Tab) => items.filter((booking) => matchesTab(booking, value)).length;

  const selected = filtered.find((b) => b.id === selectedId) ?? filtered[0] ?? null;

  return (
    <div>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>{t('ui.account.myBookings')}</h1>
          <p className={styles.subtitle}>{pluralizeCount(items.length)}</p>
        </div>

        {/* A tablist rather than a row of buttons: the active tab is announced
            as selected, not merely coloured differently. */}
        <div className={`${styles.tabs} no-scrollbar`} role="tablist" aria-label="Filter bookings">
          {TABS.map((item) => {
            const active = tab === item.value;
            return (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(item.value)}
                className={cn(styles.tab, active ? styles.tabActive : styles.tabInactive)}
              >
                {item.label}
                <span className={styles.tabCount}>{countFor(item.value)}</span>
              </button>
            );
          })}
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
                  <Link href="/hotels">{t('ui.comingSoon.browseHotels')}</Link>
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

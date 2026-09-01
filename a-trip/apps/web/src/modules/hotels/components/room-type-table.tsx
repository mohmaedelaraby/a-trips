'use client';

import * as React from 'react';
import Link from 'next/link';
import { BedDouble, Users } from 'lucide-react';
import { Button } from '../../../shared/components/button';
import { StatusChip } from '../../../shared/components/status-chip';
import { formatPrice, pluralize, cn } from '../../../shared/lib/utils';
import type { RoomTypeWithAvailability } from '../interfaces/hotel';
import styles from '../styles/room-type-table.module.css';

const REASON_LABEL: Record<string, string> = {
  STOP_SELL: 'Closed for these dates',
  NO_INVENTORY: 'Not open for sale yet',
  SOLD_OUT: 'Sold out for these dates',
  INACTIVE: 'Not currently on sale',
  CAPACITY: 'Too small for your party',
};

export function RoomTypeTable({
  hotelSlug,
  roomTypes,
  checkIn,
  checkOut,
  adults,
  children,
  onSelect,
  selectedRoomTypeId,
}: {
  hotelId: string;
  hotelSlug: string;
  roomTypes: RoomTypeWithAvailability[];
  checkIn?: string;
  checkOut?: string;
  adults?: number;
  children?: number;
  onSelect?: (roomTypeId: string) => void;
  selectedRoomTypeId?: string | null;
}) {
  const hasDates = Boolean(checkIn && checkOut);

  if (roomTypes.length === 0) {
    return <div className={styles.empty}>No room types are on sale for this hotel right now.</div>;
  }

  return (
    <div className={styles.table}>
      <div className={styles.head}>
        <span>Room type</span>
        <span>Sleeps</span>
        <span>Size</span>
        <span>Price / night</span>
        <span className={styles.headRight}>Available</span>
      </div>

      <div className={styles.body}>
        {roomTypes.map((room) => {
          const availability = room.availability;
          const bookable = !hasDates || availability?.bookable;
          const nightly = hasDates ? (availability?.averageNightlyPrice ?? null) : room.basePrice;
          const total = hasDates ? (availability?.totalPrice ?? null) : null;
          const unavailable = hasDates && !bookable;

          const checkoutHref = new URLSearchParams({
            roomTypeId: room.id,
            hotelSlug,
            ...(checkIn ? { checkIn } : {}),
            ...(checkOut ? { checkOut } : {}),
            adults: String(adults ?? 2),
            ...(children ? { children: String(children) } : {}),
          });

          return (
            <div
              key={room.id}
              className={cn(
                styles.row,
                unavailable && styles.rowUnavailable,
                selectedRoomTypeId === room.id && styles.rowSelected,
              )}
            >
              <div className={styles.roomInfo}>
                <div className={styles.roomThumb} />
                <div className="min-w-0">
                  <p className={styles.roomName}>{room.name}</p>
                  <p className={styles.roomMeta}>
                    <BedDouble className="h-3 w-3" />
                    {pluralize(room.numOfBeds, 'bed')}
                    {room.description ? ` · ${room.description}` : ''}
                  </p>
                </div>
              </div>

              <div className={styles.sleeps}>
                <Users className={cn('h-3.5 w-3.5 text-ink-muted', styles.sleepsIcon)} />
                {room.capacityAdults} adult{room.capacityAdults === 1 ? '' : 's'}
                {room.capacityChildren > 0 ? ` + ${room.capacityChildren} child` : ''}
              </div>

              <div className={styles.size}>{room.sizeSqm ? `${room.sizeSqm} m²` : '—'}</div>

              <div>
                {unavailable ? (
                  <span className={styles.priceDash}>—</span>
                ) : (
                  <p className={styles.price}>
                    {formatPrice(nightly)}
                    {total !== null ? <span className={styles.priceTotal}>{formatPrice(total)} total</span> : null}
                  </p>
                )}
              </div>

              <div className={styles.availabilityCol}>
                {unavailable ? (
                  <StatusChip tone="danger">
                    {availability?.reason ? (REASON_LABEL[availability.reason] ?? 'Not available') : 'Not available 10–13 Sep'}
                  </StatusChip>
                ) : hasDates && availability ? (
                  <StatusChip tone={availability.minUnitsAvailable <= 2 ? 'warning' : 'success'}>
                    {availability.minUnitsAvailable <= 2
                      ? `Only ${availability.minUnitsAvailable} left`
                      : `${availability.minUnitsAvailable} rooms left`}
                  </StatusChip>
                ) : (
                  <span />
                )}

                {onSelect ? (
                  <Button type="button" size="sm" disabled={!hasDates || !bookable} onClick={() => onSelect(room.id)}>
                    {hasDates ? 'Book' : 'Pick dates'}
                  </Button>
                ) : (
                  <Button asChild={Boolean(hasDates && bookable)} disabled={!hasDates || !bookable} size="sm">
                    {hasDates && bookable ? (
                      <Link href={`/checkout?${checkoutHref.toString()}`}>Book</Link>
                    ) : (
                      <span>{hasDates ? 'Unavailable' : 'Pick dates'}</span>
                    )}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

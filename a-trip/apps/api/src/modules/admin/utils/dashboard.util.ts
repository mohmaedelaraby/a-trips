export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function nightsBetween(from: Date, to: Date): number {
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / 86_400_000));
}

/** A room type at or below this many units left is worth flagging to staff. */
export const LOW_AVAILABILITY_THRESHOLD = 2;

/** How far ahead the portal expects staff to have opened dates for sale. */
export const AVAILABILITY_HORIZON_DAYS = 90;

export interface LowAvailabilityRow {
  roomTypeId: string;
  date: Date;
  totalUnits: number;
  stopSell: boolean;
  roomType: { name: string; hotel: { name: string } };
}

export interface LowAvailabilitySpan {
  hotelName: string;
  roomTypeName: string;
  unitsLeft: number;
  from: string;
  to: string;
  stopSell: boolean;
}

/**
 * Collapses per-day availability rows into one entry per room type, keeping the
 * date span.
 *
 * Rows arrive date-ascending, so extending `to` as they come through yields the
 * span without a second sort. Stop-sell and low-stock are keyed separately: they
 * are different problems for staff, and merging them would hide one behind the
 * other on a room type that has both.
 */
export function collapseLowAvailability(rows: LowAvailabilityRow[]): LowAvailabilitySpan[] {
  const spans = new Map<string, LowAvailabilitySpan>();

  for (const row of rows) {
    const key = `${row.roomTypeId}:${row.stopSell ? 'stop' : 'low'}`;
    const date = isoDate(row.date);
    const existing = spans.get(key);
    if (existing) {
      existing.to = date;
      existing.unitsLeft = Math.min(existing.unitsLeft, row.totalUnits);
    } else {
      spans.set(key, {
        hotelName: row.roomType.hotel.name,
        roomTypeName: row.roomType.name,
        unitsLeft: row.totalUnits,
        from: date,
        to: date,
        stopSell: row.stopSell,
      });
    }
  }

  return Array.from(spans.values());
}

/** Null rather than a fake 100% when there is no previous week to compare to. */
export function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

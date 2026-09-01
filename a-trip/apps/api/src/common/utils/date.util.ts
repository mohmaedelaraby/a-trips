const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Parses a YYYY-MM-DD string into a UTC-midnight Date, matching Prisma's @db.Date handling. */
export function parseDateOnly(value: string): Date {
  if (!ISO_DATE.test(value)) {
    throw new Error(`Invalid date "${value}", expected YYYY-MM-DD`);
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date "${value}"`);
  }
  return date;
}

export function toDateOnlyString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/** Nights between check-in and check-out. Check-out night is not sold. */
export function countNights(checkIn: Date, checkOut: Date): number {
  const ms = checkOut.getTime() - checkIn.getTime();
  return Math.round(ms / 86_400_000);
}

/**
 * Every night that must be inventoried for a stay: [checkIn, checkOut).
 * Standard hotel convention - the check-out date itself is excluded.
 */
export function eachStayNight(checkIn: Date, checkOut: Date): Date[] {
  const nights: Date[] = [];
  for (let d = new Date(checkIn.getTime()); d < checkOut; d = addDays(d, 1)) {
    nights.push(new Date(d.getTime()));
  }
  return nights;
}

/** Inclusive range, used by admin calendar and bulk edit where "to" is a real day. */
export function eachDayInclusive(from: Date, to: Date, daysOfWeek?: number[]): Date[] {
  const days: Date[] = [];
  const filter = daysOfWeek && daysOfWeek.length > 0 ? new Set(daysOfWeek) : null;
  for (let d = new Date(from.getTime()); d <= to; d = addDays(d, 1)) {
    if (!filter || filter.has(d.getUTCDay())) {
      days.push(new Date(d.getTime()));
    }
  }
  return days;
}

export function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

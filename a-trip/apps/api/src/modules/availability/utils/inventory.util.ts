import { Prisma } from '../../../generated/prisma/client';

export const MAX_RANGE_DAYS = 400;

/** How long a booking holds its rooms while the guest completes payment. */
export const HOLD_MINUTES = 15;

/**
 * Which bookings consume a night's inventory.
 *
 * CONFIRMED and PENDING_CONFIRMATION (paid, awaiting staff) always do. A
 * PENDING_PAYMENT booking does too, but only while its hold is still live —
 * that is what stops two guests paying for the same last room, and what makes
 * an abandoned checkout release the room the moment the hold lapses, with no
 * sweeper in the path. The sweeper only relabels rows; it never frees them.
 *
 * Every query that counts inventory must use this fragment. Diverging on one of
 * them is how double-booking creeps back in.
 *
 * `NOW() AT TIME ZONE 'UTC'`, not bare `NOW()`. Prisma maps DateTime to
 * `timestamp` (no zone) and writes the UTC wall-clock into it, while `NOW()`
 * is a `timestamptz` that Postgres renders in the *server's* zone when compared
 * against a naive timestamp. On any server not set to UTC the two disagree by
 * the offset — which silently made every live hold look long expired and let
 * two guests book the same last room.
 */
export const CONSUMES_INVENTORY = Prisma.sql`(
  b."status" IN ('PENDING_CONFIRMATION', 'CONFIRMED')
  OR (b."status" = 'PENDING_PAYMENT' AND b."holdExpiresAt" > (NOW() AT TIME ZONE 'UTC'))
)`;

export interface RawNightRow {
  date: Date;
  totalUnits: number;
  priceOverride: Prisma.Decimal | null;
  stopSell: boolean;
  bookedUnits: number;
}

export interface BatchRow {
  roomTypeId: string;
  nightsCovered: number;
  minUnits: number;
  anyStopSell: boolean;
  totalPrice: Prisma.Decimal;
}

export interface BatchAssessment {
  bookable: boolean;
  minUnitsAvailable: number;
  totalPrice: number | null;
  nights: number;
}

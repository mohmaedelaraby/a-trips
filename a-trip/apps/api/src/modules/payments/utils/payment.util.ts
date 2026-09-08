import { ConflictException } from '@nestjs/common';
import { BookingStatus } from '../../../generated/prisma/enums';
import { HOLD_MINUTES } from '../../availability/availability.service';

/** Captured amounts within this many currency units of the total are accepted. */
export const AMOUNT_TOLERANCE = 0.01;

export function isExpired(holdExpiresAt: Date | null): boolean {
  return holdExpiresAt !== null && holdExpiresAt.getTime() <= Date.now();
}

/**
 * Rejects a booking that is in no state to be paid for.
 *
 * Called before the PayPal round trip, and the states are distinguished so the
 * guest is told which one they are in — "already paid" and "hold expired" call
 * for completely different next steps.
 */
export function assertHoldLive(booking: {
  status: BookingStatus;
  holdExpiresAt: Date | null;
}): void {
  if (booking.status === BookingStatus.PENDING_CONFIRMATION) {
    throw new ConflictException('This booking is already paid and awaiting confirmation');
  }
  if (booking.status !== BookingStatus.PENDING_PAYMENT) {
    throw new ConflictException(`This booking cannot be paid (it is ${booking.status})`);
  }
  if (isExpired(booking.holdExpiresAt)) {
    throw new ConflictException(
      `Your ${HOLD_MINUTES}-minute hold expired. Please search again — the rooms may still be available.`,
    );
  }
}

/**
 * True when a capture did not fully cover the quote.
 *
 * A missing amount counts as short-paid: if PayPal did not tell us what was
 * taken, we cannot claim the booking is covered.
 */
export function isShortPaid(captured: number | null, expected: number): boolean {
  return captured === null || captured + AMOUNT_TOLERANCE < expected;
}

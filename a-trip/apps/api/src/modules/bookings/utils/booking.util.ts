import { Prisma } from '../../../generated/prisma/client';
import { toNumber } from '../../../common/utils/decimal.util';
import { buildPriceBreakdown } from '../../../common/utils/pricing.util';
import { countNights, parseDateOnly } from '../../../common/utils/date.util';
import type { AdminBookingQueryDto } from '../dto/booking.dto';

export const bookingInclude = {
  hotel: {
    include: { images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 } },
  },
  roomType: true,
  user: { select: { id: true, name: true, email: true, phone: true } },
  // Status only — gateway ids and raw payloads never reach a booking response.
  payment: { select: { status: true } },
} satisfies Prisma.BookingInclude;

export type BookingRow = Prisma.BookingGetPayload<{ include: typeof bookingInclude }>;

/** Postgres serialization / deadlock codes worth one retry. */
export const RETRYABLE_PG_CODES = new Set(['40001', '40P01']);
export const MAX_ATTEMPTS = 3;

/**
 * A serialization failure or deadlock means the transaction lost a race, not
 * that the request was wrong — the same input can succeed on a second attempt.
 * Every other error is returned to the caller as-is.
 */
export function isRetryable(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return typeof code === 'string' && RETRYABLE_PG_CODES.has(code);
}

/**
 * Guest-facing wording for why a range cannot be booked.
 *
 * The default is deliberately the "someone just took it" phrasing: it covers
 * losing the race for the last unit, which is the only case a guest can hit
 * after seeing the room as available.
 */
export function unavailableMessage(reason?: string): string {
  switch (reason) {
    case 'STOP_SELL':
      return 'These dates are closed for sale';
    case 'NO_INVENTORY':
      return 'This room is not on sale for the selected dates';
    case 'INACTIVE':
      return 'This room type is not currently on sale';
    default:
      return 'This room was just booked and is no longer available for those dates';
  }
}

/** Translates the admin filter form into a Prisma `where`. */
export function buildAdminBookingWhere(query: AdminBookingQueryDto): Prisma.BookingWhereInput {
  const where: Prisma.BookingWhereInput = {};

  if (query.status) where.status = query.status;
  if (query.hotelId) where.hotelId = query.hotelId;
  if (query.reference) {
    where.bookingReference = { contains: query.reference.trim(), mode: 'insensitive' };
  }
  if (query.guest) {
    where.user = {
      OR: [
        { name: { contains: query.guest, mode: 'insensitive' } },
        { email: { contains: query.guest, mode: 'insensitive' } },
      ],
    };
  }
  if (query.submittedWithinDays) {
    where.createdAt = { gte: new Date(Date.now() - query.submittedWithinDays * 86_400_000) };
  }
  if (query.checkInFrom || query.checkInTo) {
    where.checkInDate = {
      ...(query.checkInFrom ? { gte: parseDateOnly(query.checkInFrom) } : {}),
      ...(query.checkInTo ? { lte: parseDateOnly(query.checkInTo) } : {}),
    };
  }

  return where;
}

/**
 * Wire shape for a booking.
 *
 * `includeGuest` gates the guest's name, email and phone: a reference lookup is
 * unauthenticated, so anyone holding a reference could otherwise read the
 * booker's contact details.
 */
export function toBookingDto(booking: BookingRow, includeGuest: boolean) {
  const primaryImage = booking.hotel.images[0];
  return {
    id: booking.id,
    bookingReference: booking.bookingReference,
    hotelId: booking.hotelId,
    roomTypeId: booking.roomTypeId,
    roomTypeName: booking.roomType.name,
    checkInDate: booking.checkInDate.toISOString().slice(0, 10),
    checkOutDate: booking.checkOutDate.toISOString().slice(0, 10),
    nights: countNights(booking.checkInDate, booking.checkOutDate),
    numAdults: booking.numAdults,
    numChildren: booking.numChildren,
    totalPrice: toNumber(booking.totalPrice),
    // Same split the availability assessment returns, so the confirmation page
    // shows the identical figures the guest saw before paying.
    priceBreakdown: buildPriceBreakdown(toNumber(booking.totalPrice)),
    status: booking.status,
    // Lets the checkout show a live countdown and stop offering to pay once
    // the hold has gone.
    holdExpiresAt: booking.holdExpiresAt?.toISOString() ?? null,
    paymentStatus: booking.payment?.status ?? null,
    adminNote: booking.adminNote,
    specialRequests: booking.specialRequests,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
    hotel: {
      id: booking.hotel.id,
      slug: booking.hotel.slug,
      name: booking.hotel.name,
      city: booking.hotel.city,
      country: booking.hotel.country,
      address: booking.hotel.address,
      stars: booking.hotel.stars,
      imageUrl: primaryImage ? primaryImage.url : null,
    },
    ...(includeGuest ? { guest: booking.user } : {}),
  };
}

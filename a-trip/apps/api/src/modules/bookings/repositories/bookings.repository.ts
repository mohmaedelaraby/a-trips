import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type { Booking, Prisma } from '../../../generated/prisma/client';
import { bookingInclude, type BookingRow } from '../utils/booking.util';

/** Either the pooled client or a transaction — every read below accepts both. */
export type PrismaClientLike = PrismaService | Prisma.TransactionClient;

@Injectable()
export class BookingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Runs `fn` in one interactive transaction.
   *
   * The booking create needs the availability check and the insert to be atomic,
   * and the row locks it takes must be held until commit. The timeout is
   * generous because the transaction may be waiting on a competing request's
   * locks, not on work of its own.
   */
  transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn, { timeout: 15_000, maxWait: 10_000 });
  }

  /** Read inside the booking transaction, hence the explicit client. */
  findRoomTypeForBooking(client: PrismaClientLike, roomTypeId: string) {
    return client.roomType.findUnique({
      where: { id: roomTypeId },
      include: { hotel: { select: { id: true, status: true } } },
    });
  }

  create(client: PrismaClientLike, data: Prisma.BookingUncheckedCreateInput): Promise<BookingRow> {
    return client.booking.create({ data, include: bookingInclude });
  }

  findById(id: string): Promise<Booking | null> {
    return this.prisma.booking.findUnique({ where: { id } });
  }

  findByIdWithRelations(id: string): Promise<BookingRow | null> {
    return this.prisma.booking.findUnique({ where: { id }, include: bookingInclude });
  }

  findByReference(reference: string): Promise<BookingRow | null> {
    return this.prisma.booking.findUnique({
      where: { bookingReference: reference },
      include: bookingInclude,
    });
  }

  update(id: string, data: Prisma.BookingUpdateInput): Promise<BookingRow> {
    return this.prisma.booking.update({ where: { id }, data, include: bookingInclude });
  }

  /** One page of bookings plus the total, issued together. */
  findPage(where: Prisma.BookingWhereInput, orderBy: Prisma.BookingOrderByWithRelationInput[], skip: number, take: number) {
    return Promise.all([
      this.prisma.booking.findMany({ where, include: bookingInclude, orderBy, skip, take }),
      this.prisma.booking.count({ where }),
    ]);
  }
}

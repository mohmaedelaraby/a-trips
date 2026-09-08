import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '../../../generated/prisma/client';
import { RoomTypeStatus } from '../../../generated/prisma/enums';
import { CONSUMES_INVENTORY, type BatchRow, type RawNightRow } from '../utils/inventory.util';

/**
 * Any Prisma client — the base service or an interactive transaction handle.
 *
 * The booking flow calls into here from inside its own transaction, so the
 * locking reads must run on that handle rather than a fresh pooled connection —
 * otherwise the locks would be taken and released by a different transaction and
 * protect nothing.
 */
export type PrismaLike = Pick<PrismaService, '$queryRaw' | 'roomType'>;

@Injectable()
export class AvailabilityRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** The pooled client, for callers that are not inside a transaction. */
  get client(): PrismaService {
    return this.prisma;
  }

  /**
   * Live per-night inventory for a room type over [fromInclusive, toExclusive).
   *
   * available(date) = RoomAvailability.totalUnits
   *                   - COUNT(active bookings covering that night)
   *
   * Bookings are counted by overlap on [checkInDate, checkOutDate) so the
   * check-out night is never consumed. Which statuses consume a night is defined
   * once in CONSUMES_INVENTORY, so rejecting, cancelling or letting a payment
   * hold lapse frees the room with no separate release step. Nothing is ever
   * stored as a decrementing counter.
   */
  readNights(
    client: PrismaLike,
    roomTypeId: string,
    fromInclusive: Date,
    toExclusive: Date,
  ): Promise<RawNightRow[]> {
    return client.$queryRaw<RawNightRow[]>`
      SELECT
        ra."date",
        ra."totalUnits",
        ra."priceOverride",
        ra."stopSell",
        COALESCE(booked.count, 0)::int AS "bookedUnits"
      FROM "RoomAvailability" ra
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS count
        FROM "Booking" b
        WHERE b."roomTypeId" = ra."roomTypeId"
          AND ${CONSUMES_INVENTORY}
          AND b."checkInDate" <= ra."date"
          AND b."checkOutDate" > ra."date"
      ) booked ON TRUE
      WHERE ra."roomTypeId" = ${roomTypeId}
        AND ra."date" >= ${fromInclusive}
        AND ra."date" < ${toExclusive}
      ORDER BY ra."date" ASC
    `;
  }

  /**
   * Takes row locks on every RoomAvailability row backing a stay so two
   * concurrent bookings for the last unit serialise instead of both succeeding.
   * Must be called inside an interactive transaction, before assessRange.
   */
  async lockNightsForUpdate(
    client: PrismaLike,
    roomTypeId: string,
    checkIn: Date,
    checkOut: Date,
  ): Promise<void> {
    await client.$queryRaw`
      SELECT ra."id"
      FROM "RoomAvailability" ra
      WHERE ra."roomTypeId" = ${roomTypeId}
        AND ra."date" >= ${checkIn}
        AND ra."date" < ${checkOut}
      ORDER BY ra."date" ASC
      FOR UPDATE
    `;
  }

  findRoomTypeForPricing(client: PrismaLike, roomTypeId: string) {
    return client.roomType.findUnique({
      where: { id: roomTypeId },
      select: { id: true, basePrice: true, status: true },
    });
  }

  findRoomTypeBasePrice(roomTypeId: string) {
    return this.prisma.roomType.findUnique({
      where: { id: roomTypeId },
      select: { id: true, basePrice: true },
    });
  }

  roomTypeExists(roomTypeId: string) {
    return this.prisma.roomType.findUnique({ where: { id: roomTypeId }, select: { id: true } });
  }

  /**
   * Per-date sellability across every active room type of a hotel.
   *
   * BOOL_OR because one sellable room type is enough to make the date
   * selectable — the picker only needs to grey out nights where nothing at all
   * can be had.
   */
  findHotelNightlySellability(hotelId: string, from: Date, to: Date) {
    return this.prisma.$queryRaw<Array<{ date: Date; sellable: boolean }>>`
      SELECT
        ra."date",
        BOOL_OR(
          NOT ra."stopSell"
          AND (ra."totalUnits" - COALESCE(booked.count, 0)) > 0
        ) AS "sellable"
      FROM "RoomAvailability" ra
      JOIN "RoomType" rt ON rt."id" = ra."roomTypeId"
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS count
        FROM "Booking" b
        WHERE b."roomTypeId" = ra."roomTypeId"
          AND ${CONSUMES_INVENTORY}
          AND b."checkInDate" <= ra."date"
          AND b."checkOutDate" > ra."date"
      ) booked ON TRUE
      WHERE rt."hotelId" = ${hotelId}
        AND rt."status" = ${RoomTypeStatus.ACTIVE}::"RoomTypeStatus"
        AND ra."date" >= ${from}
        AND ra."date" < ${to}
      GROUP BY ra."date"
    `;
  }

  /**
   * Batched assessment for search results — one aggregate query for many room
   * types instead of one round trip each.
   */
  assessManyRoomTypes(roomTypeIds: string[], checkIn: Date, checkOut: Date) {
    return this.prisma.$queryRaw<BatchRow[]>`
      SELECT
        ra."roomTypeId",
        COUNT(*)::int AS "nightsCovered",
        MIN(ra."totalUnits" - COALESCE(booked.count, 0))::int AS "minUnits",
        BOOL_OR(ra."stopSell") AS "anyStopSell",
        SUM(COALESCE(ra."priceOverride", rt."basePrice")) AS "totalPrice"
      FROM "RoomAvailability" ra
      JOIN "RoomType" rt ON rt."id" = ra."roomTypeId"
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS count
        FROM "Booking" b
        WHERE b."roomTypeId" = ra."roomTypeId"
          AND ${CONSUMES_INVENTORY}
          AND b."checkInDate" <= ra."date"
          AND b."checkOutDate" > ra."date"
      ) booked ON TRUE
      WHERE ra."roomTypeId" = ANY(${roomTypeIds}::text[])
        AND ra."date" >= ${checkIn}
        AND ra."date" < ${checkOut}
      GROUP BY ra."roomTypeId"
    `;
  }

  /** Upsert every date in one transaction — no day-by-day editing. */
  bulkUpsertNights(
    roomTypeId: string,
    dates: Date[],
    data: { totalUnits: number; priceOverride: Prisma.Decimal | null; stopSell: boolean },
  ) {
    return this.prisma.$transaction(
      dates.map((date) =>
        this.prisma.roomAvailability.upsert({
          where: { roomTypeId_date: { roomTypeId, date } },
          create: { roomTypeId, date, ...data },
          update: data,
        }),
      ),
    );
  }

  setStopSell(roomTypeId: string, dates: Date[], stopSell: boolean) {
    return this.prisma.roomAvailability.updateMany({
      where: { roomTypeId, date: { in: dates } },
      data: { stopSell },
    });
  }
}

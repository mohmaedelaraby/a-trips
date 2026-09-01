import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { RoomTypeStatus } from '../../generated/prisma/enums';
import {
  addDays,
  countNights,
  eachDayInclusive,
  eachStayNight,
  parseDateOnly,
  toDateOnlyString,
} from '../../common/utils/date.util';
import { round2, toNumber } from '../../common/utils/decimal.util';
import type { BulkAvailabilityDto } from './dto/bulk-availability.dto';
import type { StopSellDto } from './dto/stop-sell.dto';
import type { NightAssessment, RangeAssessment } from './availability.types';

/** Any Prisma client - the base service or an interactive transaction handle. */
export type PrismaLike = Pick<PrismaService, '$queryRaw' | 'roomType'>;

interface RawNightRow {
  date: Date;
  totalUnits: number;
  priceOverride: Prisma.Decimal | null;
  stopSell: boolean;
  bookedUnits: number;
}

interface BatchRow {
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

export const MAX_RANGE_DAYS = 400;

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Live per-night inventory for a room type over [fromInclusive, toExclusive).
   *
   * available(date) = RoomAvailability.totalUnits
   *                   - COUNT(active bookings covering that night)
   *
   * Bookings are counted by overlap on [checkInDate, checkOutDate) so the
   * check-out night is never consumed. Only PENDING_CONFIRMATION and CONFIRMED
   * consume inventory, so rejecting or cancelling frees a room with no separate
   * release step. Nothing is ever stored as a decrementing counter.
   */
  private async readNights(
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
          AND b."status" IN ('PENDING_CONFIRMATION', 'CONFIRMED')
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

  /** Assess a stay: bookable only if every night has a free unit and no stop-sell. */
  async assessRange(
    client: PrismaLike,
    roomTypeId: string,
    checkInStr: string,
    checkOutStr: string,
  ): Promise<RangeAssessment> {
    const checkIn = parseDateOnly(checkInStr);
    const checkOut = parseDateOnly(checkOutStr);
    const nights = countNights(checkIn, checkOut);

    if (nights < 1) {
      throw new BadRequestException('Check-out must be at least one night after check-in');
    }
    if (nights > MAX_RANGE_DAYS) {
      throw new BadRequestException(`Stays longer than ${MAX_RANGE_DAYS} nights are not supported`);
    }

    const roomType = await client.roomType.findUnique({
      where: { id: roomTypeId },
      select: { id: true, basePrice: true, status: true },
    });
    if (!roomType) throw new NotFoundException('Room type not found');

    if (roomType.status === RoomTypeStatus.INACTIVE) {
      return {
        checkIn: checkInStr,
        checkOut: checkOutStr,
        nights,
        bookable: false,
        minUnitsAvailable: 0,
        totalPrice: null,
        averageNightlyPrice: null,
        reason: 'INACTIVE',
        nightsDetail: [],
      };
    }

    const basePrice = toNumber(roomType.basePrice);
    const rows = await this.readNights(client, roomTypeId, checkIn, checkOut);
    const byDate = new Map(rows.map((row) => [toDateOnlyString(row.date), row]));

    const nightsDetail: NightAssessment[] = [];
    let minUnits = Number.POSITIVE_INFINITY;
    let total = 0;
    let missingInventory = false;
    let stopSold = false;

    for (const night of eachStayNight(checkIn, checkOut)) {
      const key = toDateOnlyString(night);
      const row = byDate.get(key);

      if (!row) {
        // No calendar row means the admin has not opened this date for sale at all.
        missingInventory = true;
        minUnits = 0;
        nightsDetail.push({
          date: key,
          totalUnits: 0,
          bookedUnits: 0,
          unitsAvailable: 0,
          price: basePrice,
          stopSell: false,
        });
        continue;
      }

      const price = row.priceOverride === null ? basePrice : toNumber(row.priceOverride);
      const unitsAvailable = Math.max(0, row.totalUnits - row.bookedUnits);
      if (row.stopSell) stopSold = true;
      minUnits = Math.min(minUnits, unitsAvailable);
      total += price;
      nightsDetail.push({
        date: key,
        totalUnits: row.totalUnits,
        bookedUnits: row.bookedUnits,
        unitsAvailable,
        price,
        stopSell: row.stopSell,
      });
    }

    const minUnitsAvailable = Number.isFinite(minUnits) ? minUnits : 0;
    const bookable = !missingInventory && !stopSold && minUnitsAvailable > 0;

    let reason: RangeAssessment['reason'];
    if (missingInventory) reason = 'NO_INVENTORY';
    else if (stopSold) reason = 'STOP_SELL';
    else if (minUnitsAvailable <= 0) reason = 'SOLD_OUT';

    return {
      checkIn: checkInStr,
      checkOut: checkOutStr,
      nights,
      bookable,
      minUnitsAvailable,
      totalPrice: missingInventory ? null : round2(total),
      averageNightlyPrice: missingInventory ? null : round2(total / nights),
      ...(reason ? { reason } : {}),
      nightsDetail,
    };
  }

  assessRangePublic(roomTypeId: string, checkIn: string, checkOut: string) {
    return this.assessRange(this.prisma, roomTypeId, checkIn, checkOut);
  }

  /**
   * Batched assessment for search results - one aggregate query for many room
   * types instead of one round trip each. Uses the same rules as assessRange:
   * every night must have inventory, be free of stop-sell, and have a unit left.
   */
  async assessManyRoomTypes(
    roomTypeIds: string[],
    checkInStr: string,
    checkOutStr: string,
  ): Promise<Map<string, BatchAssessment>> {
    const result = new Map<string, BatchAssessment>();
    if (roomTypeIds.length === 0) return result;

    const checkIn = parseDateOnly(checkInStr);
    const checkOut = parseDateOnly(checkOutStr);
    const nights = countNights(checkIn, checkOut);
    if (nights < 1) {
      throw new BadRequestException('Check-out must be at least one night after check-in');
    }

    const rows = await this.prisma.$queryRaw<BatchRow[]>`
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
          AND b."status" IN ('PENDING_CONFIRMATION', 'CONFIRMED')
          AND b."checkInDate" <= ra."date"
          AND b."checkOutDate" > ra."date"
      ) booked ON TRUE
      WHERE ra."roomTypeId" = ANY(${roomTypeIds}::text[])
        AND ra."date" >= ${checkIn}
        AND ra."date" < ${checkOut}
      GROUP BY ra."roomTypeId"
    `;

    const byId = new Map(rows.map((row) => [row.roomTypeId, row]));
    for (const id of roomTypeIds) {
      const row = byId.get(id);
      if (!row || row.nightsCovered < nights) {
        result.set(id, { bookable: false, minUnitsAvailable: 0, totalPrice: null, nights });
        continue;
      }
      const minUnits = Math.max(0, row.minUnits);
      result.set(id, {
        bookable: !row.anyStopSell && minUnits > 0,
        minUnitsAvailable: minUnits,
        totalPrice: round2(toNumber(row.totalPrice)),
        nights,
      });
    }
    return result;
  }

  /** Admin calendar view over an inclusive date range. */
  async getCalendar(roomTypeId: string, fromStr: string, toStr: string) {
    const from = parseDateOnly(fromStr);
    const to = parseDateOnly(toStr);
    if (to < from) throw new BadRequestException('"to" must not be before "from"');

    const days = eachDayInclusive(from, to);
    if (days.length > MAX_RANGE_DAYS) {
      throw new BadRequestException(`Range is limited to ${MAX_RANGE_DAYS} days`);
    }

    const roomType = await this.prisma.roomType.findUnique({
      where: { id: roomTypeId },
      select: { id: true, basePrice: true },
    });
    if (!roomType) throw new NotFoundException('Room type not found');
    const basePrice = toNumber(roomType.basePrice);

    // readNights takes an exclusive upper bound; the calendar range is inclusive.
    const rows = await this.readNights(this.prisma, roomTypeId, from, addDays(to, 1));
    const byDate = new Map(rows.map((row) => [toDateOnlyString(row.date), row]));

    return {
      roomTypeId,
      from: fromStr,
      to: toStr,
      days: days.map((day) => {
        const key = toDateOnlyString(day);
        const row = byDate.get(key);
        if (!row) {
          // No row at all: the admin has never opened this date for sale.
          return {
            date: key,
            isSet: false,
            totalUnits: 0,
            bookedUnits: 0,
            unitsAvailable: 0,
            price: basePrice,
            priceOverride: null,
            stopSell: false,
          };
        }
        const priceOverride = row.priceOverride === null ? null : toNumber(row.priceOverride);
        return {
          date: key,
          isSet: true,
          totalUnits: row.totalUnits,
          bookedUnits: row.bookedUnits,
          unitsAvailable: Math.max(0, row.totalUnits - row.bookedUnits),
          price: priceOverride ?? basePrice,
          priceOverride,
          stopSell: row.stopSell,
        };
      }),
    };
  }

  /** Upsert every matching date in one request - no day-by-day editing. */
  async bulkSet(roomTypeId: string, dto: BulkAvailabilityDto) {
    const from = parseDateOnly(dto.from);
    const to = parseDateOnly(dto.to);
    if (to < from) throw new BadRequestException('"to" must not be before "from"');
    if (eachDayInclusive(from, to).length > MAX_RANGE_DAYS) {
      throw new BadRequestException(`Range is limited to ${MAX_RANGE_DAYS} days`);
    }
    await this.assertRoomTypeExists(roomTypeId);

    const dates = eachDayInclusive(from, to, dto.daysOfWeek);
    if (dates.length === 0) {
      return { datesAffected: 0, from: dto.from, to: dto.to };
    }

    const priceOverride =
      dto.priceOverride === undefined || dto.priceOverride === null
        ? null
        : new Prisma.Decimal(dto.priceOverride);
    const stopSell = dto.stopSell ?? false;

    await this.prisma.$transaction(
      dates.map((date) =>
        this.prisma.roomAvailability.upsert({
          where: { roomTypeId_date: { roomTypeId, date } },
          create: { roomTypeId, date, totalUnits: dto.totalUnits, priceOverride, stopSell },
          update: { totalUnits: dto.totalUnits, priceOverride, stopSell },
        }),
      ),
    );

    return { datesAffected: dates.length, from: dto.from, to: dto.to };
  }

  /**
   * Stop-sell is a stored per-date flag, flipped in bulk without touching units
   * or deleting inventory, so it is instantly reversible.
   */
  async setStopSell(roomTypeId: string, dto: StopSellDto) {
    const from = parseDateOnly(dto.from);
    const to = parseDateOnly(dto.to);
    if (to < from) throw new BadRequestException('"to" must not be before "from"');
    await this.assertRoomTypeExists(roomTypeId);

    const dates = eachDayInclusive(from, to, dto.daysOfWeek);
    if (dates.length === 0) {
      return { datesAffected: 0, from: dto.from, to: dto.to };
    }

    const result = await this.prisma.roomAvailability.updateMany({
      where: { roomTypeId, date: { in: dates } },
      data: { stopSell: dto.stopSell },
    });
    return { datesAffected: result.count, from: dto.from, to: dto.to };
  }

  private async assertRoomTypeExists(roomTypeId: string) {
    const roomType = await this.prisma.roomType.findUnique({
      where: { id: roomTypeId },
      select: { id: true },
    });
    if (!roomType) throw new NotFoundException('Room type not found');
  }
}

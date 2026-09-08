import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
import { AvailabilityRepository, type PrismaLike } from './repositories/availability.repository';
import { MAX_RANGE_DAYS, type BatchAssessment } from './utils/inventory.util';
import { assertStayRange, foldNights, inactiveAssessment } from './utils/assessment.util';
import type { BulkAvailabilityDto } from './dto/bulk-availability.dto';
import type { StopSellDto } from './dto/stop-sell.dto';
import type { RangeAssessment } from './availability.types';

export {
  CONSUMES_INVENTORY,
  HOLD_MINUTES,
  MAX_RANGE_DAYS,
  type BatchAssessment,
} from './utils/inventory.util';
export type { PrismaLike } from './repositories/availability.repository';

@Injectable()
export class AvailabilityService {
  constructor(private readonly repository: AvailabilityRepository) {}

  /**
   * Takes row locks on every night of a stay so two concurrent bookings for the
   * last unit serialise. Must be called inside an interactive transaction,
   * before assessRange, on that transaction's client.
   */
  lockNightsForUpdate(
    client: PrismaLike,
    roomTypeId: string,
    checkIn: Date,
    checkOut: Date,
  ): Promise<void> {
    return this.repository.lockNightsForUpdate(client, roomTypeId, checkIn, checkOut);
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
    const nights = assertStayRange(checkIn, checkOut);

    const roomType = await this.repository.findRoomTypeForPricing(client, roomTypeId);
    if (!roomType) throw new NotFoundException('Room type not found');

    if (roomType.status === RoomTypeStatus.INACTIVE) {
      return inactiveAssessment(checkInStr, checkOutStr, nights);
    }

    const rows = await this.repository.readNights(client, roomTypeId, checkIn, checkOut);

    return foldNights({
      checkIn,
      checkOut,
      checkInStr,
      checkOutStr,
      nights,
      basePrice: toNumber(roomType.basePrice),
      rows,
    });
  }

  assessRangePublic(roomTypeId: string, checkIn: string, checkOut: string) {
    return this.assessRange(this.repository.client, roomTypeId, checkIn, checkOut);
  }

  /**
   * Per-date sellability across every active room type of a hotel, so the public
   * date picker can grey out nights it is pointless to select.
   *
   * A date is `available` when at least one room type has an open calendar row
   * with no stop-sell and a free unit. Dates with no row at all are simply
   * absent from the query result and fall through to unavailable below.
   *
   * This is a per-night view, not a stay assessment: a bookable stay still
   * requires every one of its nights to be available, which assessRange decides.
   */
  async hotelNightlyAvailability(
    hotelId: string,
    fromStr: string,
    toStr: string,
  ): Promise<{ from: string; to: string; unavailableDates: string[] }> {
    const from = parseDateOnly(fromStr);
    const to = parseDateOnly(toStr);
    if (to <= from) throw new BadRequestException('`to` must be after `from`');
    if (countNights(from, to) > MAX_RANGE_DAYS) {
      throw new BadRequestException(`Range cannot exceed ${MAX_RANGE_DAYS} days`);
    }

    const rows = await this.repository.findHotelNightlySellability(hotelId, from, to);
    const sellable = new Set(
      rows.filter((row) => row.sellable).map((row) => toDateOnlyString(row.date)),
    );

    // Returning only the closed dates keeps the payload small: a hotel selling
    // normally sends almost nothing, and the client defaults to "open".
    const unavailableDates: string[] = [];
    for (const day of eachStayNight(from, to)) {
      const key = toDateOnlyString(day);
      if (!sellable.has(key)) unavailableDates.push(key);
    }

    return { from: fromStr, to: toStr, unavailableDates };
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

    const rows = await this.repository.assessManyRoomTypes(roomTypeIds, checkIn, checkOut);
    const byId = new Map(rows.map((row) => [row.roomTypeId, row]));

    for (const id of roomTypeIds) {
      const row = byId.get(id);
      // Fewer covered nights than the stay means at least one night was never
      // opened for sale, so the room is not bookable at any price.
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

    const roomType = await this.repository.findRoomTypeBasePrice(roomTypeId);
    if (!roomType) throw new NotFoundException('Room type not found');
    const basePrice = toNumber(roomType.basePrice);

    // readNights takes an exclusive upper bound; the calendar range is inclusive.
    const rows = await this.repository.readNights(
      this.repository.client,
      roomTypeId,
      from,
      addDays(to, 1),
    );
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

    await this.repository.bulkUpsertNights(roomTypeId, dates, {
      totalUnits: dto.totalUnits,
      priceOverride:
        dto.priceOverride === undefined || dto.priceOverride === null
          ? null
          : new Prisma.Decimal(dto.priceOverride),
      stopSell: dto.stopSell ?? false,
    });

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

    const result = await this.repository.setStopSell(roomTypeId, dates, dto.stopSell);
    return { datesAffected: result.count, from: dto.from, to: dto.to };
  }

  private async assertRoomTypeExists(roomTypeId: string) {
    const roomType = await this.repository.roomTypeExists(roomTypeId);
    if (!roomType) throw new NotFoundException('Room type not found');
  }
}

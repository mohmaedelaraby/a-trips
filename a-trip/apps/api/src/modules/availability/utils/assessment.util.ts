import { BadRequestException } from '@nestjs/common';
import { countNights, eachStayNight, toDateOnlyString } from '../../../common/utils/date.util';
import { round2, toNumber } from '../../../common/utils/decimal.util';
import { buildPriceBreakdown } from '../../../common/utils/pricing.util';
import type { NightAssessment, RangeAssessment } from '../availability.types';
import { MAX_RANGE_DAYS, type RawNightRow } from './inventory.util';

/**
 * Validates a stay range and returns its night count.
 *
 * The upper bound is not a business rule so much as a guard: every query below
 * scans one row per night, so an unbounded range is a cheap way to make the
 * database do unbounded work.
 */
export function assertStayRange(checkIn: Date, checkOut: Date): number {
  const nights = countNights(checkIn, checkOut);
  if (nights < 1) {
    throw new BadRequestException('Check-out must be at least one night after check-in');
  }
  if (nights > MAX_RANGE_DAYS) {
    throw new BadRequestException(`Stays longer than ${MAX_RANGE_DAYS} nights are not supported`);
  }
  return nights;
}

/** Assessment returned for a room type that is not on sale at all. */
export function inactiveAssessment(
  checkIn: string,
  checkOut: string,
  nights: number,
): RangeAssessment {
  return {
    checkIn,
    checkOut,
    nights,
    bookable: false,
    minUnitsAvailable: 0,
    totalPrice: null,
    averageNightlyPrice: null,
    priceBreakdown: null,
    reason: 'INACTIVE',
    nightsDetail: [],
  };
}

/**
 * Folds per-night rows into a stay assessment.
 *
 * A stay is bookable only if *every* night has inventory, is free of stop-sell,
 * and has a unit left — the weakest night decides, which is why this tracks a
 * running minimum rather than an average.
 *
 * A night with no row at all is not "sold out": the admin never opened that date
 * for sale. It is reported as NO_INVENTORY and suppresses the price entirely,
 * because a total that silently skipped an unopened night would undercharge.
 */
export function foldNights(input: {
  checkIn: Date;
  checkOut: Date;
  checkInStr: string;
  checkOutStr: string;
  nights: number;
  basePrice: number;
  rows: RawNightRow[];
}): RangeAssessment {
  const { checkIn, checkOut, checkInStr, checkOutStr, nights, basePrice, rows } = input;
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
    priceBreakdown: missingInventory ? null : buildPriceBreakdown(round2(total)),
    ...(reason ? { reason } : {}),
    nightsDetail,
  };
}

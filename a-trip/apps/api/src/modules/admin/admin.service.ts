import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BookingStatus, HotelStatus, RoomTypeStatus } from '../../generated/prisma/enums';
import { toNumber } from '../../common/utils/decimal.util';

const LOW_AVAILABILITY_THRESHOLD = 2;

/** How far ahead the portal expects staff to have opened dates for sale. */
export const AVAILABILITY_HORIZON_DAYS = 90;

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function nightsBetween(from: Date, to: Date) {
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / 86_400_000));
}

interface GapRow {
  roomTypeId: string;
  roomTypeName: string;
  hotelId: string;
  hotelName: string;
  openDays: number;
  firstGap: Date | null;
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Room types with dates not yet opened for sale in the next
   * AVAILABILITY_HORIZON_DAYS.
   *
   * A date with no RoomAvailability row is unsellable and shows on the site as
   * "no rooms available" — indistinguishable, to a guest, from a sold-out
   * hotel. This is the most common cause of an empty-looking hotel, so staff
   * need to see it rather than discover it from a complaint.
   *
   * The generated date series is the source of truth for what *should* exist,
   * so a gap in the middle of the horizon is caught, not just a short tail.
   */
  async availabilityGaps(limit = 50) {
    // Two passes on purpose.
    //
    // Counting open days is a plain range join, so Postgres can answer it from
    // the (roomTypeId, date) index without materialising anything. Finding the
    // *first* missing date needs a day-by-day comparison, so that runs in a
    // LATERAL over only the handful of rows this actually returns.
    //
    // The obvious one-pass version — CROSS JOIN a generated 90-day series onto
    // every room type — builds rooms × 90 rows before it can group them. At
    // 1,600 room types that is 144,000 rows and took ~1.6s; this is ~25ms.
    const rows = await this.prisma.$queryRaw<GapRow[]>`
      WITH counts AS (
        -- Aggregating the availability table on its own lets Postgres answer
        -- this from the (roomTypeId, date) index alone, without touching
        -- RoomType or the heap.
        SELECT ra."roomTypeId", COUNT(*)::int AS "openDays"
        FROM "RoomAvailability" ra
        WHERE ra."date" >= CURRENT_DATE
          AND ra."date" < CURRENT_DATE + ${AVAILABILITY_HORIZON_DAYS}::int
        GROUP BY ra."roomTypeId"
      ),
      gaps AS (
        SELECT
          rt."id"   AS "roomTypeId",
          rt."name" AS "roomTypeName",
          h."id"    AS "hotelId",
          h."name"  AS "hotelName",
          COALESCE(c."openDays", 0) AS "openDays"
        FROM "RoomType" rt
        JOIN "Hotel" h ON h."id" = rt."hotelId"
        LEFT JOIN counts c ON c."roomTypeId" = rt."id"
        WHERE rt."status" = ${RoomTypeStatus.ACTIVE}::"RoomTypeStatus"
          AND h."status" = ${HotelStatus.PUBLISHED}::"HotelStatus"
          AND COALESCE(c."openDays", 0) < ${AVAILABILITY_HORIZON_DAYS}
        ORDER BY COALESCE(c."openDays", 0) ASC, h."name" ASC
        LIMIT ${limit}
      )
      SELECT g.*, fg."firstGap"
      FROM gaps g
      LEFT JOIN LATERAL (
        SELECT d::date AS "firstGap"
        FROM generate_series(
          CURRENT_DATE,
          CURRENT_DATE + ${AVAILABILITY_HORIZON_DAYS - 1}::int,
          '1 day'
        ) d
        WHERE NOT EXISTS (
          SELECT 1 FROM "RoomAvailability" ra
          WHERE ra."roomTypeId" = g."roomTypeId" AND ra."date" = d::date
        )
        ORDER BY d
        LIMIT 1
      ) fg ON TRUE
    `;

    const items = rows.map((row) => ({
      roomTypeId: row.roomTypeId,
      roomTypeName: row.roomTypeName,
      hotelId: row.hotelId,
      hotelName: row.hotelName,
      openDays: row.openDays,
      missingDays: AVAILABILITY_HORIZON_DAYS - row.openDays,
      firstGap: row.firstGap ? isoDate(row.firstGap) : null,
      /** Nothing at all is on sale — the hotel looks empty to every guest. */
      neverOpened: row.openDays === 0,
    }));

    return {
      horizonDays: AVAILABILITY_HORIZON_DAYS,
      totalRoomTypesWithGaps: items.length,
      neverOpenedCount: items.filter((item) => item.neverOpened).length,
      items,
    };
  }

  async dashboard() {
    const weekAgo = new Date(Date.now() - 7 * 86_400_000);
    const twoWeeksAgo = new Date(Date.now() - 14 * 86_400_000);
    const today = new Date(`${isoDate(new Date())}T00:00:00.000Z`);
    const in30Days = new Date(today.getTime() + 30 * 86_400_000);

    const [
      totalHotels,
      publishedHotels,
      totalRoomTypes,
      pendingBookings,
      pendingOlderThan12h,
      confirmedBookings,
      bookingsThisWeek,
      bookingsPreviousWeek,
      revenueAgg,
      recent,
      soldBookings,
      lowAvailability,
      hotelsWithoutPhotos,
      roomTypesWithoutPrice,
      roomTypesWithFutureAvailability,
    ] = await Promise.all([
      this.prisma.hotel.count(),
      this.prisma.hotel.count({ where: { status: HotelStatus.PUBLISHED } }),
      this.prisma.roomType.count(),
      this.prisma.booking.count({ where: { status: BookingStatus.PENDING_CONFIRMATION } }),
      this.prisma.booking.count({
        where: {
          status: BookingStatus.PENDING_CONFIRMATION,
          createdAt: { lt: new Date(Date.now() - 12 * 3_600_000) },
        },
      }),
      this.prisma.booking.count({ where: { status: BookingStatus.CONFIRMED } }),
      this.prisma.booking.count({ where: { createdAt: { gte: weekAgo } } }),
      this.prisma.booking.count({ where: { createdAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
      this.prisma.booking.aggregate({
        _sum: { totalPrice: true },
        where: {
          createdAt: { gte: weekAgo },
          status: { in: [BookingStatus.PENDING_CONFIRMATION, BookingStatus.CONFIRMED] },
        },
      }),
      this.prisma.booking.findMany({
        where: { status: BookingStatus.PENDING_CONFIRMATION },
        orderBy: { createdAt: 'asc' },
        take: 8,
        include: {
          user: { select: { name: true } },
          hotel: { select: { name: true } },
          roomType: { select: { name: true } },
        },
      }),
      // Room nights sold: nights x bookings that are not rejected/cancelled.
      this.prisma.booking.findMany({
        where: { status: { in: [BookingStatus.PENDING_CONFIRMATION, BookingStatus.CONFIRMED] } },
        select: { checkInDate: true, checkOutDate: true, totalPrice: true },
      }),
      this.prisma.roomAvailability.findMany({
        where: {
          date: { gte: today, lte: in30Days },
          OR: [{ totalUnits: { lte: LOW_AVAILABILITY_THRESHOLD } }, { stopSell: true }],
        },
        orderBy: [{ date: 'asc' }],
        take: 120,
        include: {
          roomType: { select: { name: true, hotel: { select: { name: true } } } },
        },
      }),
      this.prisma.hotel.count({ where: { images: { none: {} } } }),
      this.prisma.roomType.count({ where: { basePrice: { lte: 0 } } }),
      this.prisma.roomType.findMany({
        where: { status: RoomTypeStatus.ACTIVE },
        select: {
          id: true,
          _count: { select: { availability: { where: { date: { gt: in30Days } } } } },
        },
      }),
    ]);

    const roomNightsSold = soldBookings.reduce(
      (total, booking) => total + nightsBetween(booking.checkInDate, booking.checkOutDate),
      0,
    );
    const roomNightsValue = soldBookings.reduce((total, booking) => total + toNumber(booking.totalPrice), 0);

    // Collapse per-day rows into one entry per room type, keeping the date span.
    const lowByRoomType = new Map<
      string,
      { hotelName: string; roomTypeName: string; unitsLeft: number; from: string; to: string; stopSell: boolean }
    >();
    for (const row of lowAvailability) {
      const key = `${row.roomTypeId}:${row.stopSell ? 'stop' : 'low'}`;
      const date = isoDate(row.date);
      const existing = lowByRoomType.get(key);
      if (existing) {
        existing.to = date;
        existing.unitsLeft = Math.min(existing.unitsLeft, row.totalUnits);
      } else {
        lowByRoomType.set(key, {
          hotelName: row.roomType.hotel.name,
          roomTypeName: row.roomType.name,
          unitsLeft: row.totalUnits,
          from: date,
          to: date,
          stopSell: row.stopSell,
        });
      }
    }

    const weekChange =
      bookingsPreviousWeek > 0
        ? Math.round(((bookingsThisWeek - bookingsPreviousWeek) / bookingsPreviousWeek) * 100)
        : null;

    return {
      totalHotels,
      publishedHotels,
      draftHotels: totalHotels - publishedHotels,
      totalRoomTypes,
      pendingBookings,
      pendingOlderThan12h,
      confirmedBookings,
      bookingsThisWeek,
      bookingsWeekChangePercent: weekChange,
      revenueThisWeek: toNumber(revenueAgg._sum.totalPrice),
      roomNightsSold,
      roomNightsValue,
      lowAvailability: Array.from(lowByRoomType.values()).slice(0, 5),
      missingContent: {
        hotelsWithoutPhotos,
        roomTypesWithoutPrice,
        noAvailabilityPast30Days: roomTypesWithFutureAvailability.filter(
          (roomType) => roomType._count.availability === 0,
        ).length,
      },
      recentBookings: recent.map((booking) => ({
        id: booking.id,
        bookingReference: booking.bookingReference,
        guestName: booking.user.name,
        hotelName: booking.hotel.name,
        roomTypeName: booking.roomType.name,
        checkInDate: isoDate(booking.checkInDate),
        checkOutDate: isoDate(booking.checkOutDate),
        totalPrice: toNumber(booking.totalPrice),
        status: booking.status,
        createdAt: booking.createdAt,
      })),
    };
  }
}

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
    const rows = await this.prisma.$queryRaw<GapRow[]>`
      WITH horizon AS (
        SELECT generate_series(
          CURRENT_DATE,
          CURRENT_DATE + ${AVAILABILITY_HORIZON_DAYS - 1}::int,
          '1 day'
        )::date AS day
      )
      SELECT
        rt."id"   AS "roomTypeId",
        rt."name" AS "roomTypeName",
        h."id"    AS "hotelId",
        h."name"  AS "hotelName",
        COUNT(ra."id")::int AS "openDays",
        MIN(horizon.day) FILTER (WHERE ra."id" IS NULL) AS "firstGap"
      FROM "RoomType" rt
      JOIN "Hotel" h ON h."id" = rt."hotelId"
      CROSS JOIN horizon
      LEFT JOIN "RoomAvailability" ra
        ON ra."roomTypeId" = rt."id" AND ra."date" = horizon.day
      WHERE rt."status" = ${RoomTypeStatus.ACTIVE}::"RoomTypeStatus"
        AND h."status" = ${HotelStatus.PUBLISHED}::"HotelStatus"
      GROUP BY rt."id", rt."name", h."id", h."name"
      HAVING COUNT(ra."id") < ${AVAILABILITY_HORIZON_DAYS}
      ORDER BY COUNT(ra."id") ASC, h."name" ASC
      LIMIT ${limit}
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

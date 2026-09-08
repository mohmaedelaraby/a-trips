import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BookingStatus, HotelStatus, RoomTypeStatus } from '../../../generated/prisma/enums';
import { AVAILABILITY_HORIZON_DAYS, LOW_AVAILABILITY_THRESHOLD } from '../utils/dashboard.util';

export interface GapRow {
  roomTypeId: string;
  roomTypeName: string;
  hotelId: string;
  hotelName: string;
  openDays: number;
  firstGap: Date | null;
}

@Injectable()
export class AdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Room types with dates not yet opened for sale inside the horizon.
   *
   * Two passes on purpose.
   *
   * Counting open days is a plain range join, so Postgres can answer it from the
   * (roomTypeId, date) index without materialising anything. Finding the *first*
   * missing date needs a day-by-day comparison, so that runs in a LATERAL over
   * only the handful of rows this actually returns.
   *
   * The obvious one-pass version — CROSS JOIN a generated 90-day series onto
   * every room type — builds rooms x 90 rows before it can group them. At 1,600
   * room types that is 144,000 rows and took ~1.6s; this is ~25ms.
   */
  findAvailabilityGaps(limit: number): Promise<GapRow[]> {
    return this.prisma.$queryRaw<GapRow[]>`
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
  }

  /**
   * Every figure the dashboard needs, issued together.
   *
   * One Promise.all rather than sequential awaits: these are independent, and at
   * roughly a dozen round trips the difference is the page's whole latency.
   */
  dashboardCounters(input: {
    weekAgo: Date;
    twoWeeksAgo: Date;
    halfDayAgo: Date;
    today: Date;
    in30Days: Date;
  }) {
    const { weekAgo, twoWeeksAgo, halfDayAgo, today, in30Days } = input;

    return Promise.all([
      this.prisma.hotel.count(),
      this.prisma.hotel.count({ where: { status: HotelStatus.PUBLISHED } }),
      this.prisma.roomType.count(),
      this.prisma.booking.count({ where: { status: BookingStatus.PENDING_CONFIRMATION } }),
      this.prisma.booking.count({
        where: { status: BookingStatus.PENDING_CONFIRMATION, createdAt: { lt: halfDayAgo } },
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
        include: { roomType: { select: { name: true, hotel: { select: { name: true } } } } },
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
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BookingStatus, HotelStatus, RoomTypeStatus } from '../../generated/prisma/enums';
import { toNumber } from '../../common/utils/decimal.util';

const LOW_AVAILABILITY_THRESHOLD = 2;

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function nightsBetween(from: Date, to: Date) {
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / 86_400_000));
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

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

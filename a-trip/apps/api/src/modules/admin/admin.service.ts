import { Injectable } from '@nestjs/common';
import { toNumber } from '../../common/utils/decimal.util';
import { AdminRepository } from './repositories/admin.repository';
import {
  AVAILABILITY_HORIZON_DAYS,
  collapseLowAvailability,
  isoDate,
  nightsBetween,
  percentChange,
} from './utils/dashboard.util';

export { AVAILABILITY_HORIZON_DAYS } from './utils/dashboard.util';

@Injectable()
export class AdminService {
  constructor(private readonly repository: AdminRepository) {}

  /**
   * Room types with dates not yet opened for sale in the next
   * AVAILABILITY_HORIZON_DAYS.
   *
   * A date with no RoomAvailability row is unsellable and shows on the site as
   * "no rooms available" — indistinguishable, to a guest, from a sold-out
   * hotel. This is the most common cause of an empty-looking hotel, so staff
   * need to see it rather than discover it from a complaint.
   */
  async availabilityGaps(limit = 50) {
    const rows = await this.repository.findAvailabilityGaps(limit);

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
    const now = Date.now();
    const today = new Date(`${isoDate(new Date())}T00:00:00.000Z`);

    const [
      totalHotels,
      publishedHotels,
      totalRoomTypes,
      pendingBookings,
      pendingOlderThan12h,
      pendingPayments,
      confirmedBookings,
      totalBookings,
      lifetimeRevenueAgg,
      bookingsThisWeek,
      bookingsPreviousWeek,
      revenueAgg,
      recent,
      soldBookings,
      lowAvailability,
      hotelsWithoutPhotos,
      roomTypesWithoutPrice,
      roomTypesWithFutureAvailability,
    ] = await this.repository.dashboardCounters({
      weekAgo: new Date(now - 7 * 86_400_000),
      twoWeeksAgo: new Date(now - 14 * 86_400_000),
      halfDayAgo: new Date(now - 12 * 3_600_000),
      today,
      in30Days: new Date(today.getTime() + 30 * 86_400_000),
    });

    const roomNightsSold = soldBookings.reduce(
      (total, booking) => total + nightsBetween(booking.checkInDate, booking.checkOutDate),
      0,
    );
    const roomNightsValue = soldBookings.reduce(
      (total, booking) => total + toNumber(booking.totalPrice),
      0,
    );

    return {
      totalHotels,
      publishedHotels,
      draftHotels: totalHotels - publishedHotels,
      totalRoomTypes,
      pendingBookings,
      pendingOlderThan12h,
      pendingPayments,
      confirmedBookings,
      // Lifetime headline numbers for the homepage stat cards — every other
      // count on this page is scoped to a window (this week, next 30 days);
      // these two are deliberately the exception.
      totalBookings,
      totalRevenue: toNumber(lifetimeRevenueAgg._sum.totalPrice),
      bookingsThisWeek,
      bookingsWeekChangePercent: percentChange(bookingsThisWeek, bookingsPreviousWeek),
      revenueThisWeek: toNumber(revenueAgg._sum.totalPrice),
      roomNightsSold,
      roomNightsValue,
      lowAvailability: collapseLowAvailability(lowAvailability).slice(0, 5),
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

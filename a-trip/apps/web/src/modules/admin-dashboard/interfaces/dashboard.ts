export interface LowAvailabilityRow {
  hotelName: string;
  roomTypeName: string;
  unitsLeft: number;
  from: string;
  to: string;
  stopSell: boolean;
}

/** One room type with dates not yet opened for sale inside the horizon. */
export interface AvailabilityGapRow {
  roomTypeId: string;
  roomTypeName: string;
  hotelId: string;
  hotelName: string;
  openDays: number;
  missingDays: number;
  /** First unopened date, or null when the whole horizon is open. */
  firstGap: string | null;
  /** Nothing at all is on sale — the hotel looks empty to every guest. */
  neverOpened: boolean;
}

export interface AvailabilityGaps {
  horizonDays: number;
  totalRoomTypesWithGaps: number;
  neverOpenedCount: number;
  items: AvailabilityGapRow[];
}

export interface AdminDashboardStats {
  totalHotels: number;
  publishedHotels: number;
  draftHotels: number;
  totalRoomTypes: number;
  pendingBookings: number;
  pendingOlderThan12h: number;
  /** Rooms held while a guest pays — awaiting the guest, not admin action. */
  pendingPayments: number;
  confirmedBookings: number;
  /** Lifetime counts, unlike the this-week figures below. */
  totalBookings: number;
  totalRevenue: number;
  bookingsThisWeek: number;
  bookingsWeekChangePercent: number | null;
  revenueThisWeek: number;
  roomNightsSold: number;
  roomNightsValue: number;
  lowAvailability: LowAvailabilityRow[];
  missingContent: {
    hotelsWithoutPhotos: number;
    roomTypesWithoutPrice: number;
    noAvailabilityPast30Days: number;
  };
  recentBookings: Array<{
    id: string;
    bookingReference: string;
    guestName: string;
    hotelName: string;
    roomTypeName: string;
    checkInDate: string;
    checkOutDate: string;
    totalPrice: number;
    status: string;
    createdAt: string;
  }>;
}

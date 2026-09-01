export interface LowAvailabilityRow {
  hotelName: string;
  roomTypeName: string;
  unitsLeft: number;
  from: string;
  to: string;
  stopSell: boolean;
}

export interface AdminDashboardStats {
  totalHotels: number;
  publishedHotels: number;
  draftHotels: number;
  totalRoomTypes: number;
  pendingBookings: number;
  pendingOlderThan12h: number;
  confirmedBookings: number;
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

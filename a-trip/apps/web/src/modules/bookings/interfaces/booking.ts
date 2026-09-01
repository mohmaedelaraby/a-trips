import type { BookingStatus, PaginatedResult } from '../../../shared/interfaces/api';

export interface BookingHotelSummary {
  id: string;
  slug: string;
  name: string;
  city: string;
  country: string;
  address: string;
  stars: number;
  imageUrl: string | null;
}

export interface BookingGuestSummary {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

export interface Booking {
  id: string;
  bookingReference: string;
  hotelId: string;
  roomTypeId: string;
  roomTypeName: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  numAdults: number;
  numChildren: number;
  totalPrice: number;
  status: BookingStatus;
  adminNote: string | null;
  specialRequests: string | null;
  createdAt: string;
  updatedAt: string;
  hotel: BookingHotelSummary;
  guest?: BookingGuestSummary;
}

export interface CreateBookingPayload {
  roomTypeId: string;
  checkInDate: string;
  checkOutDate: string;
  numAdults: number;
  numChildren?: number;
  specialRequests?: string;
}

export interface AdminBookingQuery {
  status?: BookingStatus;
  hotelId?: string;
  reference?: string;
  guest?: string;
  checkInFrom?: string;
  checkInTo?: string;
  submittedWithinDays?: number;
  page?: number;
  pageSize?: number;
}

export interface BookingDecisionPayload {
  adminNote?: string;
}

export type BookingList = PaginatedResult<Booking>;

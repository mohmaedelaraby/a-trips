/**
 * Wire types shared across the frontend. These mirror the API's response
 * envelope and enums; each module owns its own domain interfaces.
 */

export interface ApiResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorBody {
  success: false;
  statusCode: number;
  message: string;
  errors?: Record<string, string[]>;
  path: string;
  timestamp: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

export const Role = { USER: 'USER', ADMIN: 'ADMIN' } as const;
export type Role = (typeof Role)[keyof typeof Role];

export const HotelStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  /** Retired but kept because bookings reference it. Hidden from the site. */
  ARCHIVED: 'ARCHIVED',
} as const;
export type HotelStatus = (typeof HotelStatus)[keyof typeof HotelStatus];

export const RoomTypeStatus = { ACTIVE: 'ACTIVE', INACTIVE: 'INACTIVE' } as const;
export type RoomTypeStatus = (typeof RoomTypeStatus)[keyof typeof RoomTypeStatus];

export const BookingStatus = {
  /** Rooms are held while the guest pays; expires with the hold. */
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  PENDING_CONFIRMATION: 'PENDING_CONFIRMATION',
  CONFIRMED: 'CONFIRMED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  /** The hold lapsed before payment completed; the rooms went back on sale. */
  EXPIRED: 'EXPIRED',
} as const;
export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  PENDING_PAYMENT: 'Awaiting payment',
  PENDING_CONFIRMATION: 'Awaiting confirmation',
  CONFIRMED: 'Confirmed',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Payment expired',
};

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

export const HotelStatus = { DRAFT: 'DRAFT', PUBLISHED: 'PUBLISHED' } as const;
export type HotelStatus = (typeof HotelStatus)[keyof typeof HotelStatus];

export const RoomTypeStatus = { ACTIVE: 'ACTIVE', INACTIVE: 'INACTIVE' } as const;
export type RoomTypeStatus = (typeof RoomTypeStatus)[keyof typeof RoomTypeStatus];

export const BookingStatus = {
  PENDING_CONFIRMATION: 'PENDING_CONFIRMATION',
  CONFIRMED: 'CONFIRMED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
} as const;
export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  PENDING_CONFIRMATION: 'Awaiting confirmation',
  CONFIRMED: 'Confirmed',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

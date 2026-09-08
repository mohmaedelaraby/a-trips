import type { HotelStatus, PaginatedResult } from '../../../shared/interfaces/api';
import type { Hotel } from './hotel';

export interface AdminHotelListItem extends Hotel {
  translations?: Record<string, Record<string, string>>;
  roomTypeCount: number;
  fromPrice: number | null;
}

export type AdminHotelList = PaginatedResult<AdminHotelListItem>;

export interface AdminHotelQuery {
  q?: string;
  status?: HotelStatus;
  city?: string;
  page?: number;
  pageSize?: number;
}

export interface HotelImageInput {
  url: string;
  sortOrder?: number;
  isPrimary?: boolean;
}

export interface CreateHotelPayload {
  /**
   * Per-locale overrides for translatable fields, shaped
   * { AR: { name, city, address, description } }. A blank value clears the
   * override so the English shows through.
   */
  translations?: Record<string, Record<string, string>>;
  name: string;
  city: string;
  address: string;
  country: string;
  description?: string;
  stars: number;
  latitude?: number;
  longitude?: number;
  amenities?: string[];
  status?: HotelStatus;
  images?: HotelImageInput[];
}

export type UpdateHotelPayload = Partial<CreateHotelPayload>;

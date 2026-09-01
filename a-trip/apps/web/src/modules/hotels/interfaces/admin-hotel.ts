import type { HotelStatus, PaginatedResult } from '../../../shared/interfaces/api';
import type { Hotel } from './hotel';

export interface AdminHotelListItem extends Hotel {
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

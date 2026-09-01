import type { HotelStatus, PaginatedResult, RoomTypeStatus } from '../../../shared/interfaces/api';

export interface HotelImage {
  id: string;
  url: string;
  sortOrder: number;
  isPrimary: boolean;
}

export interface RoomType {
  id: string;
  hotelId: string;
  name: string;
  description: string | null;
  capacityAdults: number;
  capacityChildren: number;
  numOfBeds: number;
  /** Physical rooms of this type; the ceiling for per-date availability. */
  totalUnits: number;
  sizeSqm: number | null;
  basePrice: number;
  status: RoomTypeStatus;
}

export type UnavailableReason = 'STOP_SELL' | 'NO_INVENTORY' | 'SOLD_OUT' | 'INACTIVE' | 'CAPACITY';

export interface RoomTypeAvailability {
  checkIn: string;
  checkOut: string;
  nights: number;
  bookable: boolean;
  minUnitsAvailable: number;
  totalPrice: number | null;
  averageNightlyPrice: number | null;
  reason?: UnavailableReason;
}

export interface RoomTypeWithAvailability extends RoomType {
  availability?: RoomTypeAvailability;
}

export interface Hotel {
  id: string;
  slug: string;
  name: string;
  city: string;
  address: string;
  country: string;
  description: string | null;
  stars: number;
  latitude: number | null;
  longitude: number | null;
  amenities: string[];
  status: HotelStatus;
  images: HotelImage[];
  createdAt: string;
  updatedAt: string;
}

export interface HotelListItem extends Hotel {
  fromPrice: number | null;
  roomTypeCount: number;
  nights: number;
}

export interface HotelDetail extends Hotel {
  roomTypes: RoomTypeWithAvailability[];
}

export type HotelSortKey = 'recommended' | 'price_asc' | 'price_desc' | 'stars_desc' | 'name_asc';

export interface HotelSearchParams {
  city?: string;
  q?: string;
  checkIn?: string;
  checkOut?: string;
  adults?: number;
  children?: number;
  minPrice?: number;
  maxPrice?: number;
  stars?: number[];
  amenities?: string[];
  sort?: HotelSortKey;
  page?: number;
  pageSize?: number;
}

export interface HotelFacets {
  cities: Array<{ value: string; count: number }>;
  amenities: Array<{ value: string; count: number }>;
  stars: Array<{ value: number; count: number }>;
  priceRange: { min: number; max: number } | null;
}

export interface HotelSearchResult {
  items: HotelListItem[];
  meta: PaginatedResult<HotelListItem>['meta'];
  facets: HotelFacets;
}

export interface HotelDetailParams {
  checkIn?: string;
  checkOut?: string;
  adults?: number;
  children?: number;
}

'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../../shared/lib/api-client';
import type {
  HotelDetail,
  HotelDetailParams,
  HotelSearchParams,
  HotelSearchResult,
} from '../interfaces/hotel';

function toQueryParams(params: HotelSearchParams): Record<string, unknown> {
  return {
    city: params.city || undefined,
    q: params.q || undefined,
    checkIn: params.checkIn || undefined,
    checkOut: params.checkOut || undefined,
    adults: params.adults,
    children: params.children,
    minPrice: params.minPrice ?? undefined,
    maxPrice: params.maxPrice ?? undefined,
    stars: params.stars?.length ? params.stars.join(',') : undefined,
    amenities: params.amenities?.length ? params.amenities.join(',') : undefined,
    sort: params.sort,
    page: params.page,
    pageSize: params.pageSize,
  };
}

export function useHotelSearch(params: HotelSearchParams) {
  return useQuery({
    queryKey: ['hotels', 'search', params],
    queryFn: () => apiGet<HotelSearchResult>('/hotels', toQueryParams(params)),
    placeholderData: (previous) => previous,
  });
}

export function useHotelDetail(idOrSlug: string, params: HotelDetailParams) {
  return useQuery({
    queryKey: ['hotels', 'detail', idOrSlug, params],
    queryFn: () =>
      apiGet<HotelDetail>(`/hotels/${idOrSlug}`, {
        checkIn: params.checkIn || undefined,
        checkOut: params.checkOut || undefined,
        adults: params.adults,
        children: params.children,
      }),
    enabled: Boolean(idOrSlug),
    // Changing dates/guests changes the key; keep the current hotel on screen
    // while it refetches instead of dropping the page back to a skeleton.
    placeholderData: (previous) => previous,
  });
}

export function useCities() {
  return useQuery({
    queryKey: ['hotels', 'cities'],
    queryFn: () => apiGet<Array<{ value: string; count: number }>>('/hotels/cities'),
    staleTime: 5 * 60_000,
  });
}

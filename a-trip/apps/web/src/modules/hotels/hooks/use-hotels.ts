'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../../shared/lib/api-client';
import { useLocale } from '../../../shared/i18n/use-translation';
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
  // Locale is part of the key: hotel names and descriptions are translated
  // server-side, so the Arabic and English results are different payloads.
  const locale = useLocale();
  return useQuery({
    queryKey: ['hotels', 'search', params, locale],
    queryFn: () => apiGet<HotelSearchResult>('/hotels', { ...toQueryParams(params), locale }),
    placeholderData: (previous) => previous,
  });
}

export function useHotelDetail(idOrSlug: string, params: HotelDetailParams) {
  const locale = useLocale();
  return useQuery({
    queryKey: ['hotels', 'detail', idOrSlug, params, locale],
    queryFn: () =>
      apiGet<HotelDetail>(`/hotels/${idOrSlug}`, {
        locale,
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

/**
 * Dates the hotel cannot sell, for greying out the date picker. The window is
 * deliberately wide and date-only so it stays cached across guest/date edits —
 * availability does not change per party size.
 */
export function useHotelUnavailableDates(idOrSlug: string, from: string, to: string) {
  return useQuery({
    queryKey: ['hotels', 'availability', idOrSlug, from, to],
    queryFn: () =>
      apiGet<{ from: string; to: string; unavailableDates: string[] }>(
        `/hotels/${idOrSlug}/availability`,
        { from, to },
      ),
    enabled: Boolean(idOrSlug && from && to),
    staleTime: 60_000,
  });
}

export function useCities() {
  return useQuery({
    queryKey: ['hotels', 'cities'],
    queryFn: () => apiGet<Array<{ value: string; count: number }>>('/hotels/cities'),
    staleTime: 5 * 60_000,
  });
}

'use client';

import { useQuery, type QueryClient } from '@tanstack/react-query';
import { apiGet } from '../../../shared/lib/api-client';
import type { AdminDashboardStats, AvailabilityGaps } from '../interfaces/dashboard';

/**
 * Refreshes the admin summary screens.
 *
 * The dashboard counts hotels, room types, photos, prices, availability and
 * bookings — so almost every admin mutation changes one of its numbers. It is
 * one helper rather than a key repeated at each call site because that is how
 * it went wrong before: only the booking mutations remembered to invalidate it,
 * so adding a hotel left the counters stale until a hard reload. Anything that
 * writes admin data should call this.
 */
export function invalidateAdminSummary(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
  queryClient.invalidateQueries({ queryKey: ['admin', 'availability-gaps'] });
}

export function useAdminDashboard() {
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => apiGet<AdminDashboardStats>('/admin/dashboard'),
  });
}

/**
 * Room types with dates not yet opened for sale. Invalidated by the
 * availability mutations, so opening dates updates the warning immediately.
 */
export function useAvailabilityGaps() {
  return useQuery({
    queryKey: ['admin', 'availability-gaps'],
    queryFn: () => apiGet<AvailabilityGaps>('/admin/availability-gaps'),
  });
}

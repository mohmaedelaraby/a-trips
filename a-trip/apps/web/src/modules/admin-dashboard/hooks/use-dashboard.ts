'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../../shared/lib/api-client';
import type { AdminDashboardStats, AvailabilityGaps } from '../interfaces/dashboard';

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

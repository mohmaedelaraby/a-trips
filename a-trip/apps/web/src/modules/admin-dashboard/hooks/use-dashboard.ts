'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../../shared/lib/api-client';
import type { AdminDashboardStats } from '../interfaces/dashboard';

export function useAdminDashboard() {
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => apiGet<AdminDashboardStats>('/admin/dashboard'),
  });
}

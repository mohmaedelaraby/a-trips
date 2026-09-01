'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch, apiPost, ApiError } from '../../../shared/lib/api-client';
import { toast } from '../../../shared/stores/toast.store';
import type {
  AvailabilityCalendar,
  BulkAvailabilityPayload,
  BulkAvailabilityResult,
  StopSellPayload,
} from '../interfaces/availability';

export function useAvailabilityCalendar(roomTypeId: string, from: string, to: string) {
  return useQuery({
    queryKey: ['admin', 'availability', roomTypeId, from, to],
    queryFn: () =>
      apiGet<AvailabilityCalendar>(`/admin/room-types/${roomTypeId}/availability`, { from, to }),
    enabled: Boolean(roomTypeId && from && to),
  });
}

export function useBulkSetAvailability(roomTypeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BulkAvailabilityPayload) =>
      apiPost<BulkAvailabilityResult>(`/admin/room-types/${roomTypeId}/availability/bulk`, payload),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'availability', roomTypeId] });
      toast.success(`Updated ${result.datesAffected} date${result.datesAffected === 1 ? '' : 's'}`);
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Could not update availability');
    },
  });
}

export function useSetStopSell(roomTypeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: StopSellPayload) =>
      apiPatch<BulkAvailabilityResult>(`/admin/room-types/${roomTypeId}/availability/stop-sell`, payload),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'availability', roomTypeId] });
      toast.success(`Updated ${result.datesAffected} date${result.datesAffected === 1 ? '' : 's'}`);
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Could not update stop-sell');
    },
  });
}

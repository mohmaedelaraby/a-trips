'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch, ApiError } from '../../../shared/lib/api-client';
import { toast } from '../../../shared/stores/toast.store';
import type { AdminBookingQuery, Booking, BookingDecisionPayload, BookingList } from '../interfaces/booking';

export function useAdminBookings(query: AdminBookingQuery) {
  return useQuery({
    queryKey: ['admin', 'bookings', query],
    queryFn: () => apiGet<BookingList>('/admin/bookings', { ...query }),
    placeholderData: (previous) => previous,
  });
}

export function useConfirmBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: BookingDecisionPayload & { id: string }) =>
      apiPatch<Booking>(`/admin/bookings/${id}/confirm`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      toast.success('Booking confirmed');
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Could not confirm this booking');
    },
  });
}

export function useRejectBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: BookingDecisionPayload & { id: string }) =>
      apiPatch<Booking>(`/admin/bookings/${id}/reject`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      toast.success('Booking rejected');
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Could not reject this booking');
    },
  });
}

export function useSetBookingNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, adminNote }: { id: string; adminNote: string }) =>
      apiPatch<Booking>(`/admin/bookings/${id}/note`, { adminNote }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
      toast.success('Note saved');
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Could not save the note');
    },
  });
}

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch, apiPost, ApiError } from '../../../shared/lib/api-client';
import { toast } from '../../../shared/stores/toast.store';
import type { Booking, BookingList, CreateBookingPayload } from '../interfaces/booking';

export function useMyBookings(page = 1) {
  return useQuery({
    queryKey: ['bookings', 'my', page],
    queryFn: () => apiGet<BookingList>('/bookings/my', { page }),
  });
}

export function useBookingByReference(reference: string) {
  return useQuery({
    queryKey: ['bookings', 'reference', reference],
    queryFn: () => apiGet<Booking>(`/bookings/${reference}`),
    enabled: Boolean(reference),
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateBookingPayload) => apiPost<Booking>('/bookings', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['hotels'] });
    },
    onError: (error) => {
      toast.error(
        'Could not complete your booking',
        error instanceof ApiError ? error.message : undefined,
      );
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiPatch<Booking>(`/bookings/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success('Booking cancelled');
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Could not cancel this booking');
    },
  });
}

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, ApiError } from '../../../shared/lib/api-client';
import { toast } from '../../../shared/stores/toast.store';

export interface PaymentConfig {
  provider: 'PAYPAL';
  /** False when the server has no PayPal credentials; the UI says so instead of failing at click time. */
  configured: boolean;
  clientId: string | null;
  currency: string;
  holdMinutes: number;
}

export interface PayPalOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  bookingReference: string;
  holdExpiresAt: string | null;
}

export interface CaptureResponse {
  status: 'PAID' | 'ALREADY_PAID';
  bookingReference: string;
}

export function usePaymentConfig() {
  return useQuery({
    queryKey: ['payments', 'config'],
    queryFn: () => apiGet<PaymentConfig>('/payments/config'),
    staleTime: 10 * 60_000,
  });
}

/** Opens a PayPal order for a booking that is already holding its rooms. */
export function useCreatePayPalOrder() {
  return useMutation({
    mutationFn: (bookingId: string) =>
      apiPost<PayPalOrderResponse>(`/payments/paypal/orders/${bookingId}`),
  });
}

export function useCapturePayPalOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, orderId }: { bookingId: string; orderId: string }) =>
      apiPost<CaptureResponse>(`/payments/paypal/orders/${bookingId}/capture`, { orderId }),
    onSuccess: () => {
      // The hold became a real reservation, so both lists and availability move.
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['hotels'] });
    },
    onError: (error) => {
      toast.error(
        'Payment could not be completed',
        error instanceof ApiError ? error.message : undefined,
      );
    },
  });
}

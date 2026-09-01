'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiGet, apiPatch, apiPost, ApiError } from '../../../shared/lib/api-client';
import { toast } from '../../../shared/stores/toast.store';
import type {
  AdminUser,
  Amenity,
  InviteAdminUserPayload,
  UpdateAdminUserPayload,
} from '../interfaces/admin-users';

const USERS_KEY = ['admin', 'users'];
const AMENITIES_KEY = ['admin', 'amenities'];

function message(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export function useAdminUsers() {
  return useQuery({
    queryKey: USERS_KEY,
    queryFn: () => apiGet<AdminUser[]>('/admin/users'),
  });
}

export function useInviteAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: InviteAdminUserPayload) => apiPost<AdminUser>('/admin/users', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_KEY });
      toast.success('Invite sent');
    },
    onError: (error) => toast.error(message(error, 'Could not send the invite')),
  });
}

export function useUpdateAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateAdminUserPayload & { id: string }) =>
      apiPatch<AdminUser>(`/admin/users/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_KEY });
      toast.success('Staff account updated');
    },
    onError: (error) => toast.error(message(error, 'Could not update the account')),
  });
}

export function useResendInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiPost<AdminUser>(`/admin/users/${id}/resend-invite`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_KEY });
      toast.success('Invite resent');
    },
    onError: (error) => toast.error(message(error, 'Could not resend the invite')),
  });
}

export function useAmenities() {
  return useQuery({
    queryKey: AMENITIES_KEY,
    queryFn: () => apiGet<Amenity[]>('/admin/amenities'),
  });
}

export function useCreateAmenity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; category?: string }) =>
      apiPost<Amenity>('/admin/amenities', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AMENITIES_KEY });
      toast.success('Amenity added');
    },
    onError: (error) => toast.error(message(error, 'Could not add the amenity')),
  });
}

export function useUpdateAmenity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; name: string; category?: string }) =>
      apiPatch<Amenity>(`/admin/amenities/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AMENITIES_KEY });
      toast.success('Amenity updated');
    },
    onError: (error) => toast.error(message(error, 'Could not update the amenity')),
  });
}

export function useDeleteAmenity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/admin/amenities/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AMENITIES_KEY });
      toast.success('Amenity removed');
    },
    onError: (error) => toast.error(message(error, 'Could not remove the amenity')),
  });
}

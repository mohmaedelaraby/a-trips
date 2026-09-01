'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiPatch, apiPost, ApiError } from '../../../shared/lib/api-client';
import { toast } from '../../../shared/stores/toast.store';
import type { CreateRoomTypePayload, UpdateRoomTypePayload } from '../interfaces/admin-room-type';
import type { RoomType } from '../interfaces/hotel';

export function useCreateRoomType(hotelId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRoomTypePayload) =>
      apiPost<RoomType>(`/admin/hotels/${hotelId}/room-types`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'hotels', hotelId] });
      toast.success('Room type added');
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Could not add the room type');
    },
  });
}

export function useUpdateRoomType(hotelId: string, roomTypeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateRoomTypePayload) =>
      apiPatch<RoomType>(`/admin/room-types/${roomTypeId}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'hotels', hotelId] });
      toast.success('Room type updated');
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Could not update the room type');
    },
  });
}

/** Update variant for panels that switch between room types without remounting. */
export function useSaveRoomType(hotelId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateRoomTypePayload & { id: string }) =>
      apiPatch<RoomType>(`/admin/room-types/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'hotels', hotelId] });
      toast.success('Room type saved');
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Could not save the room type');
    },
  });
}

export function useDeleteRoomType(hotelId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roomTypeId: string) => apiDelete(`/admin/room-types/${roomTypeId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'hotels', hotelId] });
      toast.success('Room type removed');
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Could not remove the room type');
    },
  });
}

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiGet, apiPatch, apiPost, apiUpload, ApiError } from '../../../shared/lib/api-client';
import { toast } from '../../../shared/stores/toast.store';
import type {
  AdminHotelList,
  AdminHotelListItem,
  AdminHotelQuery,
  CreateHotelPayload,
  UpdateHotelPayload,
} from '../interfaces/admin-hotel';
import type { HotelDetail } from '../interfaces/hotel';

export function useAdminHotels(query: AdminHotelQuery) {
  return useQuery({
    queryKey: ['admin', 'hotels', query],
    queryFn: () => apiGet<AdminHotelList>('/admin/hotels', { ...query }),
    placeholderData: (previous) => previous,
  });
}

export function useAdminHotel(id: string) {
  return useQuery({
    queryKey: ['admin', 'hotels', id],
    queryFn: () => apiGet<HotelDetail>(`/admin/hotels/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateHotel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateHotelPayload) => apiPost<AdminHotelListItem>('/admin/hotels', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'hotels'] });
      toast.success('Hotel created');
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Could not create the hotel');
    },
  });
}

export function useUpdateHotel(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateHotelPayload) => apiPatch<AdminHotelListItem>(`/admin/hotels/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'hotels'] });
      toast.success('Hotel updated');
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Could not update the hotel');
    },
  });
}

export function useAddHotelImages(hotelId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (images: Array<{ url: string; isPrimary?: boolean }>) =>
      apiPost(`/admin/hotels/${hotelId}/images`, { images }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'hotels', hotelId] });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Could not add the image');
    },
  });
}

/** Uploads picked files to object storage and attaches them to the hotel. */
export function useUploadHotelImages(hotelId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ files, onProgress }: { files: File[]; onProgress?: (percent: number) => void }) =>
      apiUpload<HotelDetail>(`/admin/hotels/${hotelId}/images/upload`, files, 'files', onProgress),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'hotels'] });
      toast.success(
        variables.files.length === 1 ? 'Photo uploaded' : `${variables.files.length} photos uploaded`,
      );
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Could not upload the photos');
    },
  });
}

export function useReorderHotelImages(hotelId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (imageIds: string[]) => apiPatch(`/admin/hotels/${hotelId}/images/order`, { imageIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'hotels', hotelId] });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Could not reorder the photos');
    },
  });
}

export function useRemoveHotelImage(hotelId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (imageId: string) => apiDelete(`/admin/hotels/${hotelId}/images/${imageId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'hotels', hotelId] });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Could not remove the image');
    },
  });
}

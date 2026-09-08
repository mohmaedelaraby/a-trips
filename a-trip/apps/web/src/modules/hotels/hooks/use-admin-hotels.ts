'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiGet, apiPatch, apiPost, apiUpload, ApiError } from '../../../shared/lib/api-client';
import { invalidateAdminSummary } from '../../admin-dashboard/hooks/use-dashboard';
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
      invalidateAdminSummary(queryClient);
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
      invalidateAdminSummary(queryClient);
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
      invalidateAdminSummary(queryClient);
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
      invalidateAdminSummary(queryClient);
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

/**
 * The server takes at most 10 files per request, so larger picks are sent in
 * batches of this size rather than failing the whole selection.
 */
export const MAX_FILES_PER_UPLOAD = 10;

/**
 * Upload variant for the create flow.
 *
 * `useUploadHotelImages` binds the hotel id when the hook runs, which the
 * "Add hotel" page cannot do — the hotel does not exist until it is saved. Here
 * the id is a mutation argument instead, so photos picked before saving can be
 * attached the moment the hotel comes back with an id.
 */
export function useUploadImagesToHotel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      hotelId,
      files,
      onProgress,
    }: {
      hotelId: string;
      files: File[];
      onProgress?: (percent: number) => void;
    }) => {
      const batches: File[][] = [];
      for (let i = 0; i < files.length; i += MAX_FILES_PER_UPLOAD) {
        batches.push(files.slice(i, i + MAX_FILES_PER_UPLOAD));
      }

      let done = 0;
      let last: HotelDetail | undefined;
      for (const batch of batches) {
        last = await apiUpload<HotelDetail>(
          `/admin/hotels/${hotelId}/images/upload`,
          batch,
          'files',
          // Report progress across the whole selection, not per batch, so the
          // percentage never restarts at zero partway through.
          (percent) =>
            onProgress?.(
              Math.round(((done + (percent / 100) * batch.length) / files.length) * 100),
            ),
        );
        done += batch.length;
      }
      return last;
    },
    onSuccess: () => {
      invalidateAdminSummary(queryClient);
      queryClient.invalidateQueries({ queryKey: ['admin', 'hotels'] });
    },
  });
}

export function useReorderHotelImages(hotelId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (imageIds: string[]) => apiPatch(`/admin/hotels/${hotelId}/images/order`, { imageIds }),
    onSuccess: () => {
      invalidateAdminSummary(queryClient);
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
      invalidateAdminSummary(queryClient);
      queryClient.invalidateQueries({ queryKey: ['admin', 'hotels', hotelId] });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Could not remove the image');
    },
  });
}

/**
 * Retires a hotel. The API deletes it outright only when nothing references it;
 * a hotel with bookings is archived instead, and the response says which
 * happened so the toast can tell the truth.
 */
export function useRemoveHotel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiDelete<{ id: string; deleted: boolean; archived: boolean; bookings: number }>(
        `/admin/hotels/${id}`,
      ),
    onSuccess: (result) => {
      invalidateAdminSummary(queryClient);
      queryClient.invalidateQueries({ queryKey: ['admin', 'hotels'] });
      queryClient.invalidateQueries({ queryKey: ['hotels'] });
      if (result.archived) {
        toast.success(
          'Hotel archived',
          `It has ${result.bookings} booking${result.bookings === 1 ? '' : 's'}, so it was hidden from the site rather than deleted.`,
        );
      } else {
        toast.success('Hotel deleted');
      }
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Could not remove the hotel');
    },
  });
}

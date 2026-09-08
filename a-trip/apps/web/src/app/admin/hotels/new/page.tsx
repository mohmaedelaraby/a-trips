'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  HotelEditor,
  type HotelEditorExtras,
} from '../../../../modules/hotels/components/hotel-editor';
import {
  useCreateHotel,
  useUploadImagesToHotel,
} from '../../../../modules/hotels/hooks/use-admin-hotels';
import { apiPost } from '../../../../shared/lib/api-client';
import { toast } from '../../../../shared/stores/toast.store';
import type { HotelImage, RoomType } from '../../../../modules/hotels/interfaces/hotel';
import type { CreateHotelPayload } from '../../../../modules/hotels/interfaces/admin-hotel';

/** A photo picked before the hotel exists: the file, plus a local preview URL. */
interface PendingPhoto {
  id: string;
  file: File;
  previewUrl: string;
}

/**
 * Creating a hotel in one pass.
 *
 * The hotel row alone is not a listing a guest can find: without a room type
 * there is nothing to sell, and without RoomAvailability rows every search
 * reports "no rooms available", which is indistinguishable from sold out. Both
 * used to live on screens you visited after saving, so hotels routinely went
 * live invisible.
 *
 * So this page submits a sequence rather than one request — hotel, photos,
 * rooms, then the opening dates for each room. Ordering is forced by the API:
 * every later step needs an id the previous one returns.
 */
export default function NewHotelPage() {
  const router = useRouter();
  const createHotel = useCreateHotel();
  const uploadImages = useUploadImagesToHotel();

  const [pending, setPending] = React.useState<PendingPhoto[]>([]);
  const [uploadProgress, setUploadProgress] = React.useState<number | null>(null);
  const [busy, setBusy] = React.useState(false);

  // Object URLs hold their blob alive until revoked. Revoking happens here on
  // unmount, and in removePhoto for individually discarded ones.
  const pendingRef = React.useRef(pending);
  pendingRef.current = pending;
  React.useEffect(
    () => () => pendingRef.current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl)),
    [],
  );

  const addPhotos = (files: File[]) => {
    setPending((previous) => [
      ...previous,
      ...files.map((file) => ({
        id:
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `${file.name}-${file.size}-${Math.random()}`,
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    ]);
  };

  const removePhoto = (id: string) => {
    setPending((previous) => {
      const photo = previous.find((item) => item.id === id);
      if (photo) URL.revokeObjectURL(photo.previewUrl);
      return previous.filter((item) => item.id !== id);
    });
  };

  const reorderPhotos = (ids: string[]) => {
    setPending((previous) => {
      const byId = new Map(previous.map((photo) => [photo.id, photo]));
      const next = ids.map((id) => byId.get(id)).filter((photo): photo is PendingPhoto => !!photo);
      // Guard against a partial list leaving photos stranded and unrecoverable.
      return next.length === previous.length ? next : previous;
    });
  };

  /** Shaped like saved images so the editor's gallery needs no special case. */
  const previewImages: HotelImage[] = pending.map((photo, index) => ({
    id: photo.id,
    url: photo.previewUrl,
    sortOrder: index,
    isPrimary: index === 0,
  }));

  const submit = (payload: CreateHotelPayload, extras: HotelEditorExtras) => {
    setBusy(true);

    createHotel.mutate(payload, {
      onSuccess: async (hotel) => {
        // Each step reports its own failure and none of them undo the hotel:
        // it is already saved, and the edit screen can finish whatever did not
        // land. Silently rolling back would lose the rest of the form.
        const problems: string[] = [];

        if (pending.length > 0) {
          try {
            await uploadImages.mutateAsync({
              hotelId: hotel.id,
              files: pending.map((photo) => photo.file),
              onProgress: setUploadProgress,
            });
          } catch {
            problems.push('photos');
          } finally {
            setUploadProgress(null);
          }
        }

        let roomsCreated = 0;
        let nightsOpened = 0;

        for (const room of extras.rooms) {
          try {
            const created = await apiPost<RoomType>(`/admin/hotels/${hotel.id}/room-types`, {
              name: room.name.trim(),
              description: room.description.trim() || undefined,
              capacityAdults: room.capacityAdults,
              capacityChildren: room.capacityChildren,
              numOfBeds: room.numOfBeds,
              totalUnits: room.totalUnits,
              basePrice: Number(room.basePrice),
            });
            roomsCreated += 1;

            // Opening dates is what actually puts the room on sale, so it runs
            // per room rather than once: each has its own unit count.
            const result = await apiPost<{ datesAffected: number }>(
              `/admin/room-types/${created.id}/availability/bulk`,
              {
                from: extras.availability.from,
                to: extras.availability.to,
                totalUnits: room.totalUnits,
              },
            );
            nightsOpened = Math.max(nightsOpened, result.datesAffected);
          } catch {
            problems.push(`room "${room.name.trim() || 'unnamed'}"`);
          }
        }

        if (problems.length > 0) {
          toast.error(
            'Hotel saved, but some steps failed',
            `Could not finish: ${problems.join(', ')}. Open the hotel to complete them.`,
          );
        } else if (roomsCreated > 0) {
          toast.success(
            'Hotel is ready to book',
            `${roomsCreated} room type${roomsCreated === 1 ? '' : 's'} with ${nightsOpened} night${nightsOpened === 1 ? '' : 's'} on sale.`,
          );
        }

        setBusy(false);
        router.push(`/admin/hotels/${hotel.id}`);
      },
      onError: () => setBusy(false),
    });
  };

  return (
    <HotelEditor
      title="Add hotel"
      breadcrumb={<Link href="/admin/hotels">Hotels /</Link>}
      submitLabel="Create hotel"
      saving={busy || createHotel.isPending}
      collectRooms
      images={previewImages}
      onUploadImages={addPhotos}
      onRemoveImage={removePhoto}
      onReorderImages={reorderPhotos}
      uploading={uploadImages.isPending}
      uploadProgress={uploadProgress}
      onSubmit={submit}
    />
  );
}

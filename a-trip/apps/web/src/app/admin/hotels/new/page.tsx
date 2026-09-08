'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HotelEditor } from '../../../../modules/hotels/components/hotel-editor';
import {
  useCreateHotel,
  useUploadImagesToHotel,
} from '../../../../modules/hotels/hooks/use-admin-hotels';
import { toast } from '../../../../shared/stores/toast.store';
import type { HotelImage } from '../../../../modules/hotels/interfaces/hotel';

/** A photo picked before the hotel exists: the file, plus a local preview URL. */
interface PendingPhoto {
  id: string;
  file: File;
  previewUrl: string;
}

/**
 * Photos can be chosen while creating a hotel, even though uploading needs an
 * id the hotel does not have yet.
 *
 * They are held in memory with object-URL previews and sent the moment the
 * create call returns an id. Doing it the other way round — making people save
 * first and come back to add photos — is what the page used to do, and it read
 * as the upload button being broken.
 */
export default function NewHotelPage() {
  const router = useRouter();
  const createHotel = useCreateHotel();
  const uploadImages = useUploadImagesToHotel();

  const [pending, setPending] = React.useState<PendingPhoto[]>([]);
  const [uploadProgress, setUploadProgress] = React.useState<number | null>(null);

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

  const submit = (payload: Parameters<typeof createHotel.mutate>[0]) => {
    createHotel.mutate(payload, {
      onSuccess: async (hotel) => {
        if (pending.length === 0) {
          router.push(`/admin/hotels/${hotel.id}`);
          return;
        }

        try {
          await uploadImages.mutateAsync({
            hotelId: hotel.id,
            files: pending.map((photo) => photo.file),
            onProgress: setUploadProgress,
          });
          toast.success(
            pending.length === 1 ? 'Hotel created with 1 photo' : `Hotel created with ${pending.length} photos`,
          );
        } catch {
          // The hotel itself saved, so this is not a failed create. Say what
          // actually happened and still go to the hotel, where the photos can
          // be retried, rather than stranding the user on a form whose data is
          // already persisted.
          toast.error('Hotel created, but the photos could not be uploaded. Try adding them again.');
        } finally {
          setUploadProgress(null);
          router.push(`/admin/hotels/${hotel.id}`);
        }
      },
    });
  };

  return (
    <HotelEditor
      title="Add hotel"
      breadcrumb={<Link href="/admin/hotels">Hotels /</Link>}
      submitLabel="Create hotel"
      saving={createHotel.isPending || uploadImages.isPending}
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

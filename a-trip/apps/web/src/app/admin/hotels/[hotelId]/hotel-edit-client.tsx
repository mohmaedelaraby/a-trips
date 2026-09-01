'use client';

import Link from 'next/link';
import { HotelEditor } from '../../../../modules/hotels/components/hotel-editor';
import * as React from 'react';
import {
  useAdminHotel,
  useRemoveHotelImage,
  useReorderHotelImages,
  useUpdateHotel,
  useUploadHotelImages,
} from '../../../../modules/hotels/hooks/use-admin-hotels';
import { Skeleton } from '../../../../shared/components/skeleton';
import { adminUi as ui } from '../../../../modules/admin-dashboard/components/admin-ui';

export function HotelEditClient({ hotelId }: { hotelId: string }) {
  const query = useAdminHotel(hotelId);
  const updateHotel = useUpdateHotel(hotelId);
  const uploadImages = useUploadHotelImages(hotelId);
  const removeImage = useRemoveHotelImage(hotelId);
  const reorderImages = useReorderHotelImages(hotelId);
  const [uploadProgress, setUploadProgress] = React.useState<number | null>(null);

  const hotel = query.data;

  if (!hotel) {
    return (
      <div className={ui.body}>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <HotelEditor
      title={hotel.name}
      breadcrumb={<Link href="/admin/hotels">Hotels /</Link>}
      submitLabel="Save hotel"
      saving={updateHotel.isPending}
      images={hotel.images}
      roomTypesWithoutPrice={hotel.roomTypes.filter((room) => !room.basePrice).length}
      availabilityEndsOn={null}
      initialValues={{
        name: hotel.name,
        city: hotel.city,
        country: hotel.country,
        address: hotel.address,
        description: hotel.description ?? '',
        stars: hotel.stars,
        latitude: hotel.latitude?.toString() ?? '',
        longitude: hotel.longitude?.toString() ?? '',
        amenities: hotel.amenities,
        published: hotel.status === 'PUBLISHED',
      }}
      onSubmit={(payload) => updateHotel.mutate(payload)}
      uploading={uploadImages.isPending}
      uploadProgress={uploadProgress}
      onUploadImages={(files) =>
        uploadImages.mutate(
          { files, onProgress: setUploadProgress },
          { onSettled: () => setUploadProgress(null) },
        )
      }
      onRemoveImage={(imageId) => removeImage.mutate(imageId)}
      onReorderImages={(imageIds) => reorderImages.mutate(imageIds)}
    />
  );
}

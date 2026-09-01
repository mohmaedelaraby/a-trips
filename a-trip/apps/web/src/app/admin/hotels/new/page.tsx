'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HotelEditor } from '../../../../modules/hotels/components/hotel-editor';
import { useCreateHotel } from '../../../../modules/hotels/hooks/use-admin-hotels';

export default function NewHotelPage() {
  const router = useRouter();
  const createHotel = useCreateHotel();

  return (
    <HotelEditor
      title="Add hotel"
      breadcrumb={<Link href="/admin/hotels">Hotels /</Link>}
      submitLabel="Create hotel"
      saving={createHotel.isPending}
      onSubmit={(payload) =>
        createHotel.mutate(payload, {
          onSuccess: (hotel) => router.push(`/admin/hotels/${hotel.id}`),
        })
      }
    />
  );
}

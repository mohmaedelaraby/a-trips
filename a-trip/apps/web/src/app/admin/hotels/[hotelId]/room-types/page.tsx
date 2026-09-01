import { redirect } from 'next/navigation';

/** The room-type editor now lives at the top-level nav route. */
export default async function AdminHotelRoomTypesPage({
  params,
}: {
  params: Promise<{ hotelId: string }>;
}) {
  const { hotelId } = await params;
  redirect(`/admin/room-types?hotelId=${hotelId}`);
}

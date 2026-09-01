import { redirect } from 'next/navigation';

/** The availability calendar now lives at the top-level nav route. */
export default async function AdminHotelAvailabilityPage({
  params,
}: {
  params: Promise<{ hotelId: string }>;
}) {
  const { hotelId } = await params;
  redirect(`/admin/availability?hotelId=${hotelId}`);
}

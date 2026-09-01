import { HotelEditClient } from './hotel-edit-client';

export default async function AdminHotelEditPage({
  params,
}: {
  params: Promise<{ hotelId: string }>;
}) {
  const { hotelId } = await params;
  return <HotelEditClient hotelId={hotelId} />;
}

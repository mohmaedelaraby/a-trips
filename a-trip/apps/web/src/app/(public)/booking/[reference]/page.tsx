import { BookingConfirmationClient } from './booking-confirmation-client';

export default async function BookingConfirmationPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  return <BookingConfirmationClient reference={reference} />;
}

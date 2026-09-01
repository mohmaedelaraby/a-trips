import { Suspense } from 'react';
import { HotelDetailClient } from './hotel-detail-client';
import styles from '../../styles/loading-fallback.module.css';

export default async function HotelDetailPage({
  params,
}: {
  params: Promise<{ hotelSlug: string }>;
}) {
  const { hotelSlug } = await params;
  return (
    <Suspense fallback={<div className={`container-page ${styles.fallback}`}>Loading…</div>}>
      <HotelDetailClient hotelSlug={hotelSlug} />
    </Suspense>
  );
}

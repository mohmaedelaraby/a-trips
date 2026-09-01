import type { Metadata } from 'next';
import { Suspense } from 'react';
import { HotelsPageClient } from './hotels-page-client';
import styles from '../styles/loading-fallback.module.css';

export const metadata: Metadata = { title: 'Search hotels' };

export default function HotelsSearchPage() {
  return (
    <Suspense fallback={<div className={`container-page ${styles.fallback}`}>Loading…</div>}>
      <HotelsPageClient />
    </Suspense>
  );
}

import { Suspense } from 'react';
import { CheckoutClient } from './checkout-client';
import styles from '../styles/loading-fallback.module.css';

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className={`container-page ${styles.fallback}`}>Loading…</div>}>
      <CheckoutClient />
    </Suspense>
  );
}

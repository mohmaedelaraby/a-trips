'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Clock, ShieldCheck } from 'lucide-react';
import {
  useCapturePayPalOrder,
  useCreatePayPalOrder,
  usePaymentConfig,
} from '../hooks/use-payments';
import { useCancelBooking } from '../hooks/use-bookings';
import { formatPrice } from '../../../shared/lib/utils';
import { Button } from '../../../shared/components/button';
import type { Booking } from '../interfaces/booking';
import { useTranslation } from '../../../shared/i18n/use-translation';
import styles from '../styles/payment-step.module.css';

/** Minimal shape of the PayPal JS SDK surface this component uses. */
interface PayPalButtonsConfig {
  style?: Record<string, string>;
  createOrder: () => Promise<string>;
  onApprove: (data: { orderID: string }) => Promise<void>;
  onCancel?: () => void;
  onError?: (error: unknown) => void;
}
interface PayPalNamespace {
  Buttons: (config: PayPalButtonsConfig) => { render: (target: HTMLElement) => Promise<void> };
}
declare global {
  interface Window {
    paypal?: PayPalNamespace;
  }
}

function useCountdown(expiresAt: string | null) {
  const [msLeft, setMsLeft] = React.useState(() =>
    expiresAt ? new Date(expiresAt).getTime() - Date.now() : 0,
  );

  React.useEffect(() => {
    if (!expiresAt) return;
    const target = new Date(expiresAt).getTime();
    const tick = () => setMsLeft(target - Date.now());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  const expired = msLeft <= 0;
  const totalSeconds = Math.max(0, Math.floor(msLeft / 1000));
  return {
    expired,
    label: `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`,
    /** Under two minutes the countdown turns urgent. */
    urgent: !expired && msLeft < 120_000,
  };
}

/**
 * Step 2 of checkout: the booking already exists and is holding its rooms, so
 * this screen only has to collect the money before the hold runs out.
 */
export function PaymentStep({ booking }: { booking: Booking }) {
  const { t } = useTranslation();
  const router = useRouter();
  const config = usePaymentConfig();
  const createOrder = useCreatePayPalOrder();
  const captureOrder = useCapturePayPalOrder();
  const cancelBooking = useCancelBooking();
  const countdown = useCountdown(booking.holdExpiresAt);

  const [sdkReady, setSdkReady] = React.useState(false);
  const [sdkFailed, setSdkFailed] = React.useState(false);
  const [capturing, setCapturing] = React.useState(false);
  const buttonsRef = React.useRef<HTMLDivElement | null>(null);
  const renderedRef = React.useRef(false);

  const clientId = config.data?.clientId;
  const currency = config.data?.currency ?? 'USD';
  const paymentsReady = Boolean(config.data?.configured && clientId);

  // Load the PayPal SDK once the client id is known. It is injected rather than
  // put in the page head because the id comes from the API at runtime.
  React.useEffect(() => {
    if (!paymentsReady || !clientId) return;
    if (window.paypal) {
      setSdkReady(true);
      return;
    }
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${encodeURIComponent(currency)}&intent=capture`;
    script.async = true;
    script.onload = () => setSdkReady(true);
    script.onerror = () => setSdkFailed(true);
    document.body.appendChild(script);
  }, [paymentsReady, clientId, currency]);

  // Render the PayPal buttons exactly once; re-rendering them duplicates the UI.
  React.useEffect(() => {
    if (!sdkReady || countdown.expired || renderedRef.current) return;
    const target = buttonsRef.current;
    if (!target || !window.paypal) return;

    renderedRef.current = true;
    void window.paypal
      .Buttons({
        style: { layout: 'vertical', shape: 'rect', label: 'pay' },
        createOrder: async () => {
          const order = await createOrder.mutateAsync(booking.id);
          return order.orderId;
        },
        onApprove: async (data) => {
          setCapturing(true);
          try {
            await captureOrder.mutateAsync({ bookingId: booking.id, orderId: data.orderID });
            router.push(`/booking/${booking.bookingReference}`);
          } finally {
            setCapturing(false);
          }
        },
        onError: () => setSdkFailed(true),
      })
      .render(target);
  }, [sdkReady, countdown.expired, booking.id, booking.bookingReference, createOrder, captureOrder, router]);

  const releaseAndRestart = async () => {
    // Give the rooms back immediately rather than leaving them held until the
    // timer runs out.
    try {
      await cancelBooking.mutateAsync(booking.id);
    } catch {
      // Already expired or cancelled server-side; the redirect is what matters.
    }
    router.push(`/hotels/${booking.hotel.slug}`);
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.main}>
        <h1 className={styles.title}>{t('ui.payment.title')}</h1>
        <p className={styles.subtitle}>
          Booking <strong>{booking.bookingReference}</strong> — {booking.hotel.name},{' '}
          {booking.roomTypeName}
        </p>

        {countdown.expired ? (
          <div className={styles.expired} role="alert">
            <AlertCircle className={styles.expiredIcon} aria-hidden />
            <div>
              <p className={styles.expiredTitle}>{t('ui.payment.holdExpired')}</p>
              <p className={styles.expiredHint}>{t('ui.payment.holdExpiredBody')}</p>
              <Button variant="primary" onClick={releaseAndRestart} className={styles.expiredBtn}>
                {t('ui.payment.backToHotel')}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className={countdown.urgent ? styles.timerUrgent : styles.timer} role="status">
              <Clock className={styles.timerIcon} aria-hidden />
              <span>{t('ui.payment.roomHeldFor', { time: countdown.label })}</span>
            </div>

            {config.isLoading ? (
              <p className={styles.muted}>{t('ui.payment.loadingOptions')}</p>
            ) : !paymentsReady ? (
              <div className={styles.notice}>
                <p className={styles.noticeTitle}>{t('ui.payment.notConfigured')}</p>
                <p className={styles.noticeHint}>{t('ui.payment.notConfiguredBody')}</p>
              </div>
            ) : sdkFailed ? (
              <div className={styles.notice}>
                <p className={styles.noticeTitle}>{t('ui.payment.paypalFailed')}</p>
                <p className={styles.noticeHint}>{t('ui.payment.paypalFailedBody')}</p>
              </div>
            ) : (
              <>
                {!sdkReady ? <p className={styles.muted}>{t('ui.payment.loadingPaypal')}</p> : null}
                <div ref={buttonsRef} className={styles.buttons} />
                {capturing ? (
                  <p className={styles.capturing}>{t('ui.payment.confirming')}</p>
                ) : null}
              </>
            )}

            <button type="button" className={styles.cancelLink} onClick={releaseAndRestart}>
              {t('ui.payment.cancelAndRelease')}
            </button>
          </>
        )}
      </div>

      <aside className={styles.summary}>
        <p className={styles.summaryHeading}>{t('ui.payment.orderSummary')}</p>
        <div className={styles.summaryRow}>
          <span>{booking.hotel.name}</span>
        </div>
        <div className={styles.summaryRow}>
          <span>{booking.roomTypeName}</span>
        </div>
        <div className={styles.summaryRow}>
          <span>
            {booking.checkInDate} → {booking.checkOutDate}
          </span>
          <span>
            {booking.nights} night{booking.nights === 1 ? '' : 's'}
          </span>
        </div>
        <div className={styles.summaryTotal}>
          <span>{t('ui.common.total')}</span>
          <span>{formatPrice(booking.totalPrice)}</span>
        </div>
        <p className={styles.summaryNote}>
          <ShieldCheck className={styles.summaryNoteIcon} aria-hidden />
          {t('ui.payment.chargedOnce')}
        </p>
      </aside>
    </div>
  );
}

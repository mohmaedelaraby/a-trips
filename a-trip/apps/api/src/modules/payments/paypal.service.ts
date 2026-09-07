import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Minimal PayPal Orders v2 client — create an order, then capture it.
 *
 * Only the two calls the checkout needs are implemented, over plain fetch, so
 * the API takes no PayPal SDK dependency. Sandbox by default; set
 * PAYPAL_ENV=live to point at production.
 *
 * The amount is always sent from the server's own snapshotted booking total.
 * A client-supplied amount is never trusted, and the capture is re-checked
 * against that total before a booking is marked paid.
 */

const ENDPOINTS = {
  sandbox: 'https://api-m.sandbox.paypal.com',
  live: 'https://api-m.paypal.com',
} as const;

export interface PayPalOrder {
  id: string;
  status: string;
}

export interface PayPalCapture {
  orderId: string;
  captureId: string | null;
  status: string;
  /** Gross amount actually captured, as reported by PayPal. */
  amount: number | null;
  currency: string | null;
  raw: unknown;
}

interface TokenCache {
  token: string;
  expiresAt: number;
}

@Injectable()
export class PayPalService {
  private readonly logger = new Logger(PayPalService.name);
  private tokenCache: TokenCache | null = null;

  constructor(private readonly config: ConfigService) {}

  /** False when credentials are absent, so the API still boots without PayPal. */
  get configured(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }

  private get clientId(): string {
    return this.config.get<string>('PAYPAL_CLIENT_ID') ?? '';
  }

  /** Safe to hand to the browser — the PayPal JS SDK needs it in the page. */
  get publicClientId(): string | null {
    return this.clientId || null;
  }

  private get clientSecret(): string {
    return this.config.get<string>('PAYPAL_CLIENT_SECRET') ?? '';
  }

  private get baseUrl(): string {
    return this.config.get<string>('PAYPAL_ENV') === 'live' ? ENDPOINTS.live : ENDPOINTS.sandbox;
  }

  get currency(): string {
    return this.config.get<string>('PAYPAL_CURRENCY') ?? 'USD';
  }

  private assertConfigured(): void {
    if (!this.configured) {
      throw new ServiceUnavailableException(
        'Payments are not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.',
      );
    }
  }

  /**
   * OAuth token, cached until shortly before it expires. PayPal tokens last
   * ~9 hours, so this saves a round trip on all but the first call.
   */
  private async accessToken(): Promise<string> {
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now()) {
      return this.tokenCache.token;
    }

    const basic = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const response = await this.fetchJson<{ access_token: string; expires_in: number }>(
      `${this.baseUrl}/v1/oauth2/token`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basic}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      },
    );

    this.tokenCache = {
      token: response.access_token,
      // Renew a minute early rather than racing the expiry.
      expiresAt: Date.now() + Math.max(0, response.expires_in - 60) * 1000,
    };
    return response.access_token;
  }

  /**
   * Creates an order for the exact booking total. `reference` is the booking
   * reference, which shows on the payer's PayPal receipt.
   */
  async createOrder(amount: number, reference: string): Promise<PayPalOrder> {
    this.assertConfigured();
    const token = await this.accessToken();

    const order = await this.fetchJson<{ id: string; status: string }>(
      `${this.baseUrl}/v2/checkout/orders`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          // Makes a retried create idempotent instead of opening a second order.
          'PayPal-Request-Id': `booking-${reference}`,
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [
            {
              reference_id: reference,
              custom_id: reference,
              description: `ATrips booking ${reference}`.slice(0, 127),
              amount: {
                currency_code: this.currency,
                value: amount.toFixed(2),
              },
            },
          ],
        }),
      },
    );

    return { id: order.id, status: order.status };
  }

  /** Captures a previously created order. Safe to call once; PayPal rejects replays. */
  async captureOrder(orderId: string): Promise<PayPalCapture> {
    this.assertConfigured();
    const token = await this.accessToken();

    const result = await this.fetchJson<PayPalCaptureResponse>(
      `${this.baseUrl}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'PayPal-Request-Id': `capture-${orderId}`,
        },
      },
    );

    const capture = result.purchase_units?.[0]?.payments?.captures?.[0];
    return {
      orderId: result.id,
      captureId: capture?.id ?? null,
      status: capture?.status ?? result.status,
      amount: capture?.amount?.value ? Number(capture.amount.value) : null,
      currency: capture?.amount?.currency_code ?? null,
      raw: result,
    };
  }

  /** Reads an order back, so a capture can be verified without trusting the client. */
  async getOrder(orderId: string): Promise<{ id: string; status: string }> {
    this.assertConfigured();
    const token = await this.accessToken();
    return this.fetchJson<{ id: string; status: string }>(
      `${this.baseUrl}/v2/checkout/orders/${encodeURIComponent(orderId)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }

  private async fetchJson<T>(url: string, init: RequestInit): Promise<T> {
    let response: Response;
    try {
      response = await fetch(url, init);
    } catch (error) {
      this.logger.error(`PayPal request failed: ${String(error)}`);
      throw new ServiceUnavailableException('Could not reach PayPal, please try again');
    }

    const text = await response.text();
    if (!response.ok) {
      // PayPal error bodies can carry payer details; log the status and a short
      // excerpt rather than the whole payload.
      this.logger.error(`PayPal ${response.status} for ${url}: ${text.slice(0, 400)}`);
      throw new ServiceUnavailableException('PayPal rejected the request');
    }

    return (text ? JSON.parse(text) : {}) as T;
  }
}

interface PayPalCaptureResponse {
  id: string;
  status: string;
  purchase_units?: Array<{
    payments?: {
      captures?: Array<{
        id: string;
        status: string;
        amount?: { value: string; currency_code: string };
      }>;
    };
  }>;
}

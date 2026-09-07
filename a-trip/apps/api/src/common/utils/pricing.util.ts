import { round2 } from './decimal.util';

/**
 * The one place the tax rate lives.
 *
 * It used to be a bare `0.1` written into two React components, which had
 * drifted: the hotel detail card added 10% on top of the room price while the
 * checkout page presented the same 10% as already included. The two screens
 * quoted different totals for the same stay, and neither matched what the API
 * actually charged.
 */
export const TAX_RATE = Number(process.env.PRICING_TAX_RATE ?? 0.1);

/**
 * Quoted prices are tax-inclusive: the total is what the guest pays, and the
 * tax is a component of it rather than an addition to it. That matches what the
 * booking already stores and what the payment gateway is asked for, so nothing
 * here changes the amount charged — it only makes the breakdown honest.
 *
 * To bill tax on top instead, the change belongs here and in the booking total,
 * not in the UI.
 */
export interface PriceBreakdown {
  /** Room charge before tax. */
  roomSubtotal: number;
  /** Tax contained within the total. */
  taxAmount: number;
  /** What the guest pays — equal to the booking's stored totalPrice. */
  total: number;
  taxRate: number;
  taxIncluded: true;
}

/** Splits a tax-inclusive total into its room and tax parts. */
export function buildPriceBreakdown(total: number): PriceBreakdown {
  // Extraction, not addition: for a 10% rate the tax is total × 0.1/1.1,
  // which is ~9.09% of the gross — not 10% of it.
  const taxAmount = round2(total * (TAX_RATE / (1 + TAX_RATE)));
  return {
    roomSubtotal: round2(total - taxAmount),
    taxAmount,
    total: round2(total),
    taxRate: TAX_RATE,
    taxIncluded: true,
  };
}

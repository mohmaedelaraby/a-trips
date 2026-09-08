import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PaymentStatus } from '../../generated/prisma/enums';
import { toNumber } from '../../common/utils/decimal.util';
import { PayPalService } from './paypal.service';
import { PaymentsRepository } from './repositories/payments.repository';
import { assertHoldLive, isShortPaid } from './utils/payment.util';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly repository: PaymentsRepository,
    private readonly paypal: PayPalService,
  ) {}

  /**
   * Starts a PayPal order for a booking that is holding its rooms.
   *
   * The amount comes from the booking's stored total, never from the client,
   * so a tampered request cannot pay less than the quote.
   */
  async createPayPalOrder(userId: string, bookingId: string) {
    const booking = await this.repository.findBookingWithPayment(bookingId);
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.userId !== userId) throw new ForbiddenException('This is not your booking');

    assertHoldLive(booking);

    // A completed payment must never be charged twice, even if the client
    // replays the call after a slow response.
    if (booking.payment?.status === PaymentStatus.COMPLETED) {
      throw new ConflictException('This booking is already paid');
    }

    const amount = toNumber(booking.totalPrice);
    const order = await this.paypal.createOrder(amount, booking.bookingReference);

    await this.repository.upsertPendingPayment({
      bookingId: booking.id,
      providerOrderId: order.id,
      amount: booking.totalPrice,
      currency: this.paypal.currency,
    });

    return {
      orderId: order.id,
      amount,
      currency: this.paypal.currency,
      bookingReference: booking.bookingReference,
      holdExpiresAt: booking.holdExpiresAt?.toISOString() ?? null,
    };
  }

  /**
   * Captures the order and, only if the money actually landed, promotes the
   * booking out of its hold into PENDING_CONFIRMATION for staff to approve.
   *
   * Ordering matters. PayPal is called first, then the booking is updated in a
   * transaction that re-reads the row: capturing inside the transaction would
   * hold a database lock across a network call to an external service.
   */
  async capturePayPalOrder(userId: string, bookingId: string, orderId: string) {
    const booking = await this.repository.findBookingWithPayment(bookingId);
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.userId !== userId) throw new ForbiddenException('This is not your booking');

    // Replay of a successful capture: report success rather than charging again.
    if (booking.payment?.status === PaymentStatus.COMPLETED) {
      return { status: 'ALREADY_PAID' as const, bookingReference: booking.bookingReference };
    }

    if (!booking.payment || booking.payment.providerOrderId !== orderId) {
      throw new ConflictException('This order does not belong to this booking');
    }

    // Checked before spending money. The hold is re-checked after capture too,
    // because the PayPal round trip takes real time.
    assertHoldLive(booking);

    const capture = await this.paypal.captureOrder(orderId);
    const paid = capture.status === 'COMPLETED';
    const expected = toNumber(booking.totalPrice);

    if (!paid || isShortPaid(capture.amount, expected)) {
      await this.repository.markPaymentFailed(
        booking.id,
        capture.captureId,
        capture.raw as Prisma.InputJsonValue,
      );
      this.logger.warn(
        `Capture rejected for ${booking.bookingReference}: status=${capture.status} amount=${capture.amount ?? 'null'} expected=${expected}`,
      );
      throw new ConflictException('Payment was not completed');
    }

    const updated = await this.repository.completePayment(
      booking.id,
      { captureId: capture.captureId, raw: capture.raw as Prisma.InputJsonValue },
      // The money is captured, so the booking is honoured even if the hold
      // lapsed mid-payment. Overselling is prevented at hold time, not here —
      // refusing now would take payment and give nothing back. Staff see the
      // late capture on the booking and can reject-and-refund if the room
      // genuinely went.
      (fresh) => {
        if (fresh.holdExpiresAt !== null && fresh.holdExpiresAt.getTime() <= Date.now()) {
          this.logger.warn(
            `Hold on ${fresh.bookingReference} lapsed before capture landed; honouring the payment`,
          );
        }
      },
    );
    if (!updated) throw new NotFoundException('Booking not found');

    return { status: 'PAID' as const, bookingReference: updated.bookingReference };
  }

  /**
   * Relabels lapsed holds as EXPIRED.
   *
   * Purely cosmetic for inventory: CONSUMES_INVENTORY already ignores a lapsed
   * hold, so a room is free the instant it expires whether or not this ever
   * runs. This exists so guests and staff see an honest status instead of a
   * booking stuck on "awaiting payment" forever.
   */
  async expireLapsedHolds(): Promise<number> {
    const result = await this.repository.expireLapsedHolds();
    if (result.count > 0) {
      this.logger.log(`Expired ${result.count} lapsed payment hold(s)`);
    }
    return result.count;
  }
}

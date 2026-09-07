import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { BookingStatus, PaymentStatus } from '../../generated/prisma/enums';
import { HOLD_MINUTES } from '../availability/availability.service';
import { toNumber } from '../../common/utils/decimal.util';
import { PayPalService } from './paypal.service';

/** Captured amounts within this many currency units of the total are accepted. */
const AMOUNT_TOLERANCE = 0.01;

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paypal: PayPalService,
  ) {}

  /**
   * Starts a PayPal order for a booking that is holding its rooms.
   *
   * The amount comes from the booking's stored total, never from the client,
   * so a tampered request cannot pay less than the quote.
   */
  async createPayPalOrder(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.userId !== userId) throw new ForbiddenException('This is not your booking');

    this.assertHoldLive(booking);

    // A completed payment must never be charged twice, even if the client
    // replays the call after a slow response.
    if (booking.payment?.status === PaymentStatus.COMPLETED) {
      throw new ConflictException('This booking is already paid');
    }

    const amount = toNumber(booking.totalPrice);
    const order = await this.paypal.createOrder(amount, booking.bookingReference);

    await this.prisma.payment.upsert({
      where: { bookingId: booking.id },
      create: {
        bookingId: booking.id,
        provider: 'PAYPAL',
        providerOrderId: order.id,
        amount: booking.totalPrice,
        currency: this.paypal.currency,
        status: PaymentStatus.PENDING,
      },
      // Re-opening checkout after an abandoned attempt replaces the stale order.
      update: { providerOrderId: order.id, status: PaymentStatus.PENDING },
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
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true },
    });
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
    this.assertHoldLive(booking);

    const capture = await this.paypal.captureOrder(orderId);
    const paid = capture.status === 'COMPLETED';
    const expected = toNumber(booking.totalPrice);
    const shortPaid =
      capture.amount === null || capture.amount + AMOUNT_TOLERANCE < expected;

    if (!paid || shortPaid) {
      await this.prisma.payment.update({
        where: { bookingId: booking.id },
        data: {
          status: PaymentStatus.FAILED,
          providerCaptureId: capture.captureId,
          rawResponse: capture.raw as Prisma.InputJsonValue,
        },
      });
      this.logger.warn(
        `Capture rejected for ${booking.bookingReference}: status=${capture.status} amount=${capture.amount ?? 'null'} expected=${expected}`,
      );
      throw new ConflictException('Payment was not completed');
    }

    return this.prisma.$transaction(async (tx) => {
      const fresh = await tx.booking.findUnique({ where: { id: booking.id } });
      if (!fresh) throw new NotFoundException('Booking not found');

      // The money is captured, so the booking is honoured even if the hold
      // lapsed mid-payment. Overselling is prevented at hold time, not here —
      // refusing now would take payment and give nothing back. Staff see the
      // late capture on the booking and can reject-and-refund if the room
      // genuinely went.
      if (fresh.status === BookingStatus.PENDING_PAYMENT && this.isExpired(fresh.holdExpiresAt)) {
        this.logger.warn(
          `Hold on ${fresh.bookingReference} lapsed before capture landed; honouring the payment`,
        );
      }

      await tx.payment.update({
        where: { bookingId: fresh.id },
        data: {
          status: PaymentStatus.COMPLETED,
          providerCaptureId: capture.captureId,
          paidAt: new Date(),
          rawResponse: capture.raw as Prisma.InputJsonValue,
        },
      });

      const updated = await tx.booking.update({
        where: { id: fresh.id },
        data: {
          status: BookingStatus.PENDING_CONFIRMATION,
          // Paid bookings hold inventory unconditionally from here on.
          holdExpiresAt: null,
        },
      });

      return { status: 'PAID' as const, bookingReference: updated.bookingReference };
    });
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
    const result = await this.prisma.booking.updateMany({
      where: {
        status: BookingStatus.PENDING_PAYMENT,
        holdExpiresAt: { lt: new Date() },
      },
      data: { status: BookingStatus.EXPIRED },
    });
    if (result.count > 0) {
      this.logger.log(`Expired ${result.count} lapsed payment hold(s)`);
    }
    return result.count;
  }

  private isExpired(holdExpiresAt: Date | null): boolean {
    return holdExpiresAt !== null && holdExpiresAt.getTime() <= Date.now();
  }

  private assertHoldLive(booking: { status: BookingStatus; holdExpiresAt: Date | null }): void {
    if (booking.status === BookingStatus.PENDING_CONFIRMATION) {
      throw new ConflictException('This booking is already paid and awaiting confirmation');
    }
    if (booking.status !== BookingStatus.PENDING_PAYMENT) {
      throw new ConflictException(`This booking cannot be paid (it is ${booking.status})`);
    }
    if (this.isExpired(booking.holdExpiresAt)) {
      throw new ConflictException(
        `Your ${HOLD_MINUTES}-minute hold expired. Please search again — the rooms may still be available.`,
      );
    }
  }
}

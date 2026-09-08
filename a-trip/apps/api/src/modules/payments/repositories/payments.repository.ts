import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '../../../generated/prisma/client';
import { BookingStatus, PaymentStatus } from '../../../generated/prisma/enums';

@Injectable()
export class PaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findBookingWithPayment(bookingId: string) {
    return this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true },
    });
  }

  /**
   * Records the order we just opened at PayPal.
   *
   * Upsert rather than create: re-opening checkout after an abandoned attempt
   * replaces the stale order id on the existing row instead of failing the
   * unique constraint on bookingId.
   */
  upsertPendingPayment(input: {
    bookingId: string;
    providerOrderId: string;
    amount: Prisma.Decimal;
    currency: string;
  }) {
    return this.prisma.payment.upsert({
      where: { bookingId: input.bookingId },
      create: {
        bookingId: input.bookingId,
        provider: 'PAYPAL',
        providerOrderId: input.providerOrderId,
        amount: input.amount,
        currency: input.currency,
        status: PaymentStatus.PENDING,
      },
      update: { providerOrderId: input.providerOrderId, status: PaymentStatus.PENDING },
    });
  }

  markPaymentFailed(bookingId: string, captureId: string | null, raw: Prisma.InputJsonValue) {
    return this.prisma.payment.update({
      where: { bookingId },
      data: { status: PaymentStatus.FAILED, providerCaptureId: captureId, rawResponse: raw },
    });
  }

  /**
   * Promotes a paid booking out of its hold.
   *
   * The re-read inside the transaction is deliberate: the capture is a network
   * call that takes real time, so the row may have moved since it was checked.
   * The caller decides what to do about a lapsed hold — this only reports it.
   */
  async completePayment(
    bookingId: string,
    capture: { captureId: string | null; raw: Prisma.InputJsonValue },
    onStaleHold?: (booking: { bookingReference: string; holdExpiresAt: Date | null }) => void,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const fresh = await tx.booking.findUnique({ where: { id: bookingId } });
      if (!fresh) return null;

      if (fresh.status === BookingStatus.PENDING_PAYMENT) onStaleHold?.(fresh);

      await tx.payment.update({
        where: { bookingId: fresh.id },
        data: {
          status: PaymentStatus.COMPLETED,
          providerCaptureId: capture.captureId,
          paidAt: new Date(),
          rawResponse: capture.raw,
        },
      });

      return tx.booking.update({
        where: { id: fresh.id },
        data: {
          status: BookingStatus.PENDING_CONFIRMATION,
          // Paid bookings hold inventory unconditionally from here on.
          holdExpiresAt: null,
        },
      });
    });
  }

  /**
   * Relabels lapsed holds as EXPIRED.
   *
   * A hold with no expiry is malformed — the status column defaults to
   * PENDING_PAYMENT, so any insert that forgets holdExpiresAt lands here. It
   * holds no inventory (the SQL predicate needs a non-null date), so it would
   * otherwise sit "awaiting payment" forever.
   */
  expireLapsedHolds() {
    return this.prisma.booking.updateMany({
      where: {
        status: BookingStatus.PENDING_PAYMENT,
        OR: [{ holdExpiresAt: { lt: new Date() } }, { holdExpiresAt: null }],
      },
      data: { status: BookingStatus.EXPIRED },
    });
  }
}

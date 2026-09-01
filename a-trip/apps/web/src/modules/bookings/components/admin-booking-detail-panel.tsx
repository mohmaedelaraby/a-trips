'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { Button } from '../../../shared/components/button';
import { BookingStatusChip } from '../../../shared/components/status-chip';
import { formatDate, formatPrice, pluralize } from '../../../shared/lib/utils';
import { useConfirmBooking, useRejectBooking } from '../hooks/use-admin-bookings';
import type { Booking } from '../interfaces/booking';

export function AdminBookingDetailPanel({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const [note, setNote] = React.useState(booking.adminNote ?? '');
  const confirm = useConfirmBooking();
  const reject = useRejectBooking();
  const pending = booking.status === 'PENDING_CONFIRMATION';

  return (
    <div className="w-full shrink-0 overflow-hidden rounded-xl border border-line bg-surface shadow-lg lg:w-[372px]">
      <div className="flex items-start justify-between border-b border-line p-4">
        <div>
          <p className="font-mono text-xs font-semibold text-ink-muted">{booking.bookingReference}</p>
          <p className="font-display mt-0.5 text-[17px] font-semibold text-ink">{booking.guest?.name}</p>
        </div>
        <button type="button" onClick={onClose} className="text-ink-muted hover:text-ink" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <BookingStatusChip status={booking.status} />
        </div>

        <div className="flex flex-col gap-2 text-[13px]">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-ink-muted">Booking</p>
          <div className="flex justify-between">
            <span className="text-ink-muted">Hotel</span>
            <span className="font-semibold text-ink">{booking.hotel.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-muted">Room type</span>
            <span className="font-semibold text-ink">{booking.roomTypeName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-muted">Dates</span>
            <span className="font-semibold text-ink">
              {formatDate(booking.checkInDate)} – {formatDate(booking.checkOutDate)} · {pluralize(booking.nights, 'night')}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-muted">Guests</span>
            <span className="font-semibold text-ink">
              {pluralize(booking.numAdults, 'adult')}
              {booking.numChildren > 0 ? `, ${pluralize(booking.numChildren, 'child', 'children')}` : ''}
            </span>
          </div>
          <div className="flex items-baseline justify-between border-t border-line pt-2">
            <span className="text-[14.5px] font-bold text-ink">Total</span>
            <span className="font-display text-[19px] font-bold text-ink">
              {formatPrice(booking.totalPrice, true)}
            </span>
          </div>
        </div>

        <div className="h-px bg-line" />

        <div className="flex flex-col gap-2 text-[13px]">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-ink-muted">Guest</p>
          <div className="flex justify-between">
            <span className="text-ink-muted">Email</span>
            <span className="font-semibold text-ink">{booking.guest?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-muted">Phone</span>
            <span className="font-semibold text-ink">{booking.guest?.phone ?? '—'}</span>
          </div>
        </div>

        <div className="h-px bg-line" />

        <div>
          <label
            htmlFor="admin-note"
            className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-ink-muted"
          >
            Internal note <span className="font-medium normal-case text-ink-muted/70">— not visible to guest</span>
          </label>
          <textarea
            id="admin-note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Called hotel, awaiting reply…"
            className="w-full rounded-lg border border-line p-2.5 text-[13px] placeholder:text-ink-muted/60 focus:border-primary focus:outline-none"
          />
        </div>

        {pending ? (
          <div className="flex flex-col gap-2">
            <Button
              loading={confirm.isPending}
              onClick={() => confirm.mutate({ id: booking.id, adminNote: note || undefined })}
            >
              Confirm booking
            </Button>
            <Button
              variant="outline"
              className="border-red-200 text-danger hover:bg-danger-bg"
              loading={reject.isPending}
              onClick={() => reject.mutate({ id: booking.id, adminNote: note || undefined })}
            >
              Reject with reason
            </Button>
            <p className="text-center text-[11px] leading-relaxed text-ink-muted">
              Confirming holds the room for these dates; rejecting frees it immediately.
            </p>
          </div>
        ) : booking.adminNote ? (
          <p className="rounded-lg bg-canvas p-3 text-[12.5px] text-ink-muted">{booking.adminNote}</p>
        ) : null}
      </div>
    </div>
  );
}

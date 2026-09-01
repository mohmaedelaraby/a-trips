import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';
import { BOOKING_STATUS_LABEL, type BookingStatus, type HotelStatus } from '../interfaces/api';
import styles from '../styles/status-chip.module.css';

const chipVariants = cva(styles.chip, {
  variants: {
    tone: {
      neutral: styles.neutral,
      success: styles.success,
      warning: styles.warning,
      danger: styles.danger,
      info: styles.info,
    },
  },
  defaultVariants: { tone: 'neutral' },
});

export interface StatusChipProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof chipVariants> {
  withDot?: boolean;
}

export function StatusChip({ tone, withDot, className, children, ...props }: StatusChipProps) {
  return (
    <span className={cn(chipVariants({ tone }), className)} {...props}>
      {withDot ? <span className={styles.dot} aria-hidden /> : null}
      {children}
    </span>
  );
}

const BOOKING_TONE: Record<BookingStatus, VariantProps<typeof chipVariants>['tone']> = {
  PENDING_CONFIRMATION: 'warning',
  CONFIRMED: 'success',
  REJECTED: 'danger',
  CANCELLED: 'neutral',
};

export function BookingStatusChip({ status }: { status: BookingStatus }) {
  return (
    <StatusChip tone={BOOKING_TONE[status]} withDot>
      {BOOKING_STATUS_LABEL[status]}
    </StatusChip>
  );
}

export function HotelStatusChip({ status }: { status: HotelStatus }) {
  return (
    <StatusChip tone={status === 'PUBLISHED' ? 'success' : 'neutral'} withDot>
      {status === 'PUBLISHED' ? 'Published' : 'Draft'}
    </StatusChip>
  );
}

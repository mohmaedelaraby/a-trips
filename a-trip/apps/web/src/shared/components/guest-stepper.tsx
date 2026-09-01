'use client';

import * as React from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Minus, Plus, Users } from 'lucide-react';
import { cn, pluralize } from '../lib/utils';
import styles from '../styles/guest-stepper.module.css';

export interface GuestValue {
  adults: number;
  children: number;
}

function Stepper({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className={styles.row}>
      <div>
        <p className={styles.rowLabel}>{label}</p>
        <p className={styles.rowHint}>{hint}</p>
      </div>
      <div className={styles.rowControls}>
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          className={styles.rowButton}
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className={styles.rowValue}>{value}</span>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          className={styles.rowButton}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function GuestStepper({
  value,
  onChange,
  className,
  bare = false,
}: {
  value: GuestValue;
  onChange: (next: GuestValue) => void;
  className?: string;
  bare?: boolean;
}) {
  const summary = [
    pluralize(value.adults, 'adult'),
    value.children > 0 ? pluralize(value.children, 'child', 'children') : null,
    '1 room',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(styles.trigger, bare ? styles.triggerBare : styles.triggerDefault, className)}
        >
          <Users className={styles.icon} aria-hidden />
          <span className={styles.textWrap}>
            <span className={styles.eyebrow}>Guests &amp; rooms</span>
            <span className={styles.value}>{summary}</span>
          </span>
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content align="start" sideOffset={8} className={styles.popover}>
          <Stepper
            label="Adults"
            hint="Age 13 or above"
            value={value.adults}
            min={1}
            max={12}
            onChange={(adults) => onChange({ ...value, adults })}
          />
          <div className={styles.divider} />
          <Stepper
            label="Children"
            hint="Age 0 to 12"
            value={value.children}
            min={0}
            max={8}
            onChange={(children) => onChange({ ...value, children })}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

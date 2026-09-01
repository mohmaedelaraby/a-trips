'use client';

import * as React from 'react';
import * as Popover from '@radix-ui/react-popover';
import { DayPicker, type DateRange } from 'react-day-picker';
import 'react-day-picker/style.css';
import { CalendarDays } from 'lucide-react';
import { addDaysIso, cn, formatDate, nightsBetween, todayIso } from '../lib/utils';
import styles from '../styles/date-range-picker.module.css';

export interface DateRangeValue {
  checkIn: string | null;
  checkOut: string | null;
}

function toDate(iso: string | null): Date | undefined {
  return iso ? new Date(`${iso}T00:00:00Z`) : undefined;
}

function toIso(date: Date | undefined): string | null {
  if (!date) return null;
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    .toISOString()
    .slice(0, 10);
}

function toRange(value: DateRangeValue): DateRange | undefined {
  return value.checkIn ? { from: toDate(value.checkIn), to: toDate(value.checkOut) } : undefined;
}

/** A range is only worth committing once it spans at least one night. */
function normalize(range: DateRange | undefined): DateRangeValue {
  const checkIn = toIso(range?.from);
  let checkOut = toIso(range?.to);
  if (checkIn && checkOut && checkIn === checkOut) checkOut = addDaysIso(checkIn, 1);
  return { checkIn, checkOut };
}

export function DateRangePicker({
  value,
  onChange,
  className,
  label = 'Dates',
  bare = false,
  split = false,
}: {
  value: DateRangeValue;
  onChange: (next: DateRangeValue) => void;
  className?: string;
  label?: string;
  bare?: boolean;
  /** Renders check-in and check-out as two labeled halves instead of one combined summary. */
  split?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  // The calendar edits a local draft so a half-picked range never reaches the
  // parent — otherwise every click would push a new URL / refetch the page.
  const [draft, setDraft] = React.useState<DateRange | undefined>(() => toRange(value));
  const today = todayIso();

  // Re-seed the draft from the committed value each time the calendar opens.
  React.useEffect(() => {
    if (open) setDraft(toRange(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const commit = (range: DateRange | undefined) => {
    const next = normalize(range);
    if (next.checkIn !== value.checkIn || next.checkOut !== value.checkOut) onChange(next);
  };

  const handleSelect = (range: DateRange | undefined) => {
    setDraft(range);
    // `resetOnSelect` guarantees the first click yields `{ from, to: undefined }`,
    // so a range with a `to` is always the second click — the only point at which
    // it is worth committing (and therefore navigating / refetching).
    if (range?.from && range.to) {
      commit(range);
      setOpen(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    // Dismissing mid-pick discards the half range rather than wiping the
    // committed check-out; the draft is re-seeded from `value` on reopen.
    if (!next && draft?.from && draft.to) commit(draft);
    setOpen(next);
  };

  const nights = value.checkIn && value.checkOut ? nightsBetween(value.checkIn, value.checkOut) : 0;
  const draftIn = toIso(draft?.from);
  const draftOut = toIso(draft?.to);
  // While open, the trigger previews the draft so the user sees their first click.
  const shownIn = open ? draftIn : value.checkIn;
  const shownOut = open ? (draftOut && draftOut !== draftIn ? draftOut : null) : value.checkOut;

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(styles.trigger, bare ? styles.triggerBare : styles.triggerDefault, className)}
        >
          {split ? (
            <>
              <span className={styles.textWrap}>
                <span className={styles.eyebrow}>Check in</span>
                <span className={styles.value}>{shownIn ? formatDate(shownIn) : 'Add date'}</span>
              </span>
              <span className={styles.divider} aria-hidden />
              <span className={styles.textWrap}>
                <span className={styles.eyebrow}>Check out</span>
                <span className={styles.value}>{shownOut ? formatDate(shownOut) : 'Add date'}</span>
              </span>
            </>
          ) : (
            <>
              <CalendarDays className={styles.icon} aria-hidden />
              <span className={styles.textWrap}>
                <span className={styles.eyebrow}>{label}</span>
                <span className={styles.value}>
                  {shownIn && shownOut
                    ? `${formatDate(shownIn)} — ${formatDate(shownOut)}${
                        open ? '' : ` · ${nights} night${nights === 1 ? '' : 's'}`
                      }`
                    : shownIn
                      ? `${formatDate(shownIn)} — Add check-out`
                      : 'Add check-in and check-out'}
                </span>
              </span>
            </>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content align="start" sideOffset={8} className={styles.popover}>
          <DayPicker
            mode="range"
            numberOfMonths={2}
            selected={draft}
            onSelect={handleSelect}
            // Without this, clicking a day while a complete range is already
            // selected extends that range instead of starting a fresh one — so
            // the very first click would look like a finished selection.
            resetOnSelect
            disabled={{ before: new Date(`${today}T00:00:00Z`) }}
            defaultMonth={toDate(value.checkIn) ?? new Date()}
          />
          <div className={styles.footer}>
            <button
              type="button"
              className={styles.clearBtn}
              onClick={() => {
                setDraft(undefined);
                if (value.checkIn || value.checkOut) onChange({ checkIn: null, checkOut: null });
              }}
            >
              Clear
            </button>
            <button
              type="button"
              className={styles.doneBtn}
              onClick={() => {
                if (draft?.from && draft.to) commit(draft);
                setOpen(false);
              }}
            >
              Done
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

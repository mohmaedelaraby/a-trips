'use client';

import * as React from 'react';
import * as Popover from '@radix-ui/react-popover';
import { DayPicker, type DateRange, type Matcher } from 'react-day-picker';
import 'react-day-picker/style.css';
import { CalendarDays } from 'lucide-react';
import { addDaysIso, cn, formatDate, nightsBetween, todayIso } from '../lib/utils';
import { useTranslation } from '../i18n/use-translation';
import styles from '../styles/date-range-picker.module.css';

export interface DateRangeValue {
  checkIn: string | null;
  checkOut: string | null;
}

/**
 * Local midnight, not UTC midnight: react-day-picker compares days in the
 * browser's own timezone, so a UTC-built date lands on the previous day for
 * anyone west of Greenwich and shifts both the highlight and the disabled
 * ranges by one. `toIso` reads the same local fields back, so the two are
 * exact inverses.
 */
function toDate(iso: string | null): Date | undefined {
  if (!iso) return undefined;
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
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

/** How far ahead to look for the sold-out night that caps a stay. */
const MAX_STAY_LOOKAHEAD_DAYS = 365;

export function DateRangePicker({
  value,
  onChange,
  className,
  label,
  bare = false,
  split = false,
  unavailableDates,
}: {
  value: DateRangeValue;
  onChange: (next: DateRangeValue) => void;
  className?: string;
  /** Defaults to the translated "Dates". */
  label?: string;
  bare?: boolean;
  /** Renders check-in and check-out as two labeled halves instead of one combined summary. */
  split?: boolean;
  /**
   * `YYYY-MM-DD` nights the hotel cannot sell. Rendered dimmed and struck
   * through, and not selectable — better to show why a date is off the table
   * than to let it be picked and answer with "no rooms available".
   */
  unavailableDates?: string[];
}) {
  const { t, tn } = useTranslation();
  const [open, setOpen] = React.useState(false);
  // The calendar edits a local draft so a half-picked range never reaches the
  // parent — otherwise every click would push a new URL / refetch the page.
  const [draft, setDraft] = React.useState<DateRange | undefined>(() => toRange(value));
  const today = todayIso();

  const soldOutSet = React.useMemo(() => new Set(unavailableDates ?? []), [unavailableDates]);

  // react-day-picker calls this per rendered day, so it must stay cheap.
  const isSoldOut = React.useCallback(
    (date: Date) => {
      const iso = toIso(date);
      return iso !== null && soldOutSet.has(iso);
    },
    [soldOutSet],
  );

  // Re-seed the draft from the committed value each time the calendar opens.
  React.useEffect(() => {
    if (open) setDraft(toRange(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Half-picked: a check-in is down and the calendar is waiting for check-out.
  const pendingCheckIn = draft?.from && !draft.to ? toIso(draft.from) : null;

  /**
   * The first sold-out night on or after the pending check-in. A stay covers
   * the nights `checkIn … checkOut - 1`, so that night is the ceiling: checking
   * out *on* it is fine, checking out after it would book a night the hotel
   * cannot sell. Capping the calendar here is what keeps "pick a range, get
   * told it is unavailable" from happening at all.
   */
  const stayLimit = React.useMemo(() => {
    if (!pendingCheckIn || soldOutSet.size === 0) return null;
    let cursor = pendingCheckIn;
    for (let i = 0; i < MAX_STAY_LOOKAHEAD_DAYS; i += 1) {
      cursor = addDaysIso(cursor, 1);
      if (soldOutSet.has(cursor)) return cursor;
    }
    return null;
  }, [pendingCheckIn, soldOutSet]);

  const disabled = React.useMemo(() => {
    const matchers: Matcher[] = [{ before: toDate(today) as Date }, isSoldOut];
    // Past dates and sold-out nights are always unpickable. Once a check-in is
    // down, anything before it or beyond the first sold-out night joins them,
    // so every date still clickable makes a bookable stay.
    if (pendingCheckIn) {
      matchers.push({ before: toDate(pendingCheckIn) as Date });
      if (stayLimit) matchers.push({ after: toDate(stayLimit) as Date });
    }
    return matchers;
  }, [today, isSoldOut, pendingCheckIn, stayLimit]);

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
  const draftNights = draftIn && draftOut && draftOut !== draftIn ? nightsBetween(draftIn, draftOut) : 0;

  // Which half of the pick the calendar is on, spelled out rather than left for
  // the guest to infer from which days happen to be highlighted.
  const step: 'checkIn' | 'checkOut' = pendingCheckIn ? 'checkOut' : 'checkIn';

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(styles.trigger, bare ? styles.triggerBare : styles.triggerDefault, className)}
        >
          {split ? (
            <>
              <span className={cn(styles.textWrap, open && step === 'checkIn' && styles.textWrapActive)}>
                <span className={styles.eyebrow}>{t('ui.dates.checkIn')}</span>
                <span className={cn(styles.value, !shownIn && styles.valueEmpty)}>
                  {shownIn ? formatDate(shownIn) : t('ui.dates.addDate')}
                </span>
              </span>
              <span className={styles.divider} aria-hidden />
              <span className={cn(styles.textWrap, open && step === 'checkOut' && styles.textWrapActive)}>
                <span className={styles.eyebrow}>{t('ui.dates.checkOut')}</span>
                <span className={cn(styles.value, !shownOut && styles.valueEmpty)}>
                  {shownOut ? formatDate(shownOut) : t('ui.dates.addDate')}
                </span>
              </span>
            </>
          ) : (
            <>
              <CalendarDays className={styles.icon} aria-hidden />
              <span className={styles.textWrap}>
                <span className={styles.eyebrow}>{label ?? t('ui.common.label.dates')}</span>
                <span className={cn(styles.value, !shownIn && styles.valueEmpty)}>
                  {shownIn && shownOut
                    ? `${formatDate(shownIn)} — ${formatDate(shownOut)}${
                        open ? '' : ` · ${tn('ui.common.nights', nights)}`
                      }`
                    : shownIn
                      ? `${formatDate(shownIn)} — ${t('ui.dates.addCheckOut')}`
                      : t('ui.dates.addBoth')}
                </span>
              </span>
            </>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content align="start" sideOffset={8} className={styles.popover}>
          {/* Says which of the two dates is being picked, and — once a check-in
              is down — how far the stay may run. */}
          <div className={styles.head}>
            <p className={styles.step}>
              <span className={styles.stepIndex}>{step === 'checkIn' ? '1' : '2'}</span>
              {step === 'checkIn' ? t('ui.dates.stepCheckIn') : t('ui.dates.stepCheckOut')}
            </p>
            {step === 'checkOut' && stayLimit ? (
              <p className={styles.stepHint}>
                {t('ui.dates.limitHint', { date: formatDate(stayLimit) })}
              </p>
            ) : (
              <p className={styles.stepHint}>{t('ui.dates.availableOnlyHint')}</p>
            )}
          </div>

          <DayPicker
            mode="range"
            numberOfMonths={2}
            selected={draft}
            onSelect={handleSelect}
            // Without this, clicking a day while a complete range is already
            // selected extends that range instead of starting a fresh one — so
            // the very first click would look like a finished selection.
            resetOnSelect
            disabled={disabled}
            modifiers={{ soldOut: isSoldOut }}
            modifiersClassNames={{ soldOut: styles.daySoldOut }}
            defaultMonth={toDate(value.checkIn) ?? new Date()}
            className={styles.calendar}
          />

          <div className={styles.legend}>
            <span className={styles.legendItem}>
              <span className={styles.legendAvailable} aria-hidden />
              {t('ui.dates.legendAvailable')}
            </span>
            <span className={styles.legendItem}>
              <span className={styles.legendSelected} aria-hidden />
              {t('ui.dates.legendSelected')}
            </span>
            {soldOutSet.size > 0 ? (
              <span className={styles.legendItem}>
                <span className={styles.legendSoldOut} aria-hidden />
                {t('ui.dates.legendSoldOut')}
              </span>
            ) : null}
          </div>

          <div className={styles.footer}>
            <p className={styles.summary}>
              {draftNights > 0
                ? tn('ui.common.nights', draftNights)
                : t('ui.dates.noNightsYet')}
            </p>
            <div className={styles.footerActions}>
              <button
                type="button"
                className={styles.clearBtn}
                onClick={() => {
                  setDraft(undefined);
                  if (value.checkIn || value.checkOut) onChange({ checkIn: null, checkOut: null });
                }}
              >
                {t('ui.common.clear')}
              </button>
              <button
                type="button"
                className={styles.doneBtn}
                disabled={!draft?.from || !draft.to}
                onClick={() => {
                  if (draft?.from && draft.to) commit(draft);
                  setOpen(false);
                }}
              >
                {t('ui.common.done')}
              </button>
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

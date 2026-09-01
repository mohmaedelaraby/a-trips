'use client';

import * as React from 'react';
import type { AvailabilityDay } from '../interfaces/availability';
import { cn } from '../../../shared/lib/utils';
import styles from '../../../app/admin/styles/admin-availability.module.css';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const LOW_THRESHOLD = 2;

/** Monday-first offset for the 1st of the month. */
function leadingBlanks(year: number, month: number) {
  const weekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  return (weekday + 6) % 7;
}

export function MonthGrid({
  year,
  month,
  days,
  selected,
  onSelect,
}: {
  year: number;
  month: number;
  days: AvailabilityDay[];
  selected: string[];
  /** Shift-click extends from the previously selected date. */
  onSelect: (date: string, extend: boolean) => void;
}) {
  const byDate = React.useMemo(() => new Map(days.map((day) => [day.date, day])), [days]);
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const blanks = leadingBlanks(year, month);
  const selectedSet = React.useMemo(() => new Set(selected), [selected]);

  return (
    <>
      <div className={styles.weekdays}>
        {WEEKDAYS.map((weekday) => (
          <span key={weekday} className={styles.weekday}>
            {weekday}
          </span>
        ))}
      </div>

      <div className={styles.grid}>
        {Array.from({ length: blanks }, (_, i) => (
          <div key={`blank-${i}`} className={styles.dayEmpty} />
        ))}

        {Array.from({ length: daysInMonth }, (_, i) => {
          const dayNumber = i + 1;
          const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
          const day = byDate.get(date);
          const isSelected = selectedSet.has(date);
          const notSet = !day || !day.isSet;
          const stopSell = Boolean(day?.stopSell);
          const low = !notSet && !stopSell && (day?.unitsAvailable ?? 0) <= LOW_THRESHOLD;

          return (
            <button
              key={date}
              type="button"
              onClick={(event) => onSelect(date, event.shiftKey)}
              aria-pressed={isSelected}
              className={cn(
                styles.day,
                low && styles.dayLow,
                stopSell && styles.dayStop,
                isSelected && styles.daySelected,
              )}
            >
              <span className={styles.dayNumber}>{dayNumber}</span>
              {stopSell ? (
                <span className={styles.dayStopLabel}>Stop sell</span>
              ) : notSet ? (
                <span className={styles.dayNotSet}>Not set</span>
              ) : (
                <span className={styles.dayMeta}>
                  <span className={styles.dayUnits}>{day?.unitsAvailable} left</span> · $
                  {Math.round(day?.price ?? 0)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}

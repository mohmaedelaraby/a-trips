'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn, formatPrice, toDateInput } from '../../../shared/lib/utils';
import { Skeleton } from '../../../shared/components/skeleton';
import { useAvailabilityCalendar } from '../hooks/use-availability';
import type { AvailabilityDay } from '../interfaces/availability';

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

// Monday-first, matching the design spec's calendar header.
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export interface DateRangeSelection {
  from: string;
  to: string;
}

export function AdminAvailabilityCalendar({
  roomTypeId,
  selection,
  onSelectionChange,
}: {
  roomTypeId: string;
  selection: DateRangeSelection | null;
  onSelectionChange: (next: DateRangeSelection | null) => void;
}) {
  const [monthAnchor, setMonthAnchor] = React.useState(() => startOfMonth(new Date()));
  const [anchor, setAnchor] = React.useState<string | null>(null);
  const from = toDateInput(startOfMonth(monthAnchor));
  const to = toDateInput(endOfMonth(monthAnchor));

  const query = useAvailabilityCalendar(roomTypeId, from, to);
  const dayMap = React.useMemo(() => {
    const map = new Map<string, AvailabilityDay>();
    for (const day of query.data?.days ?? []) map.set(day.date, day);
    return map;
  }, [query.data]);

  const firstOfMonth = startOfMonth(monthAnchor);
  // getDay(): 0=Sun..6=Sat; convert to Monday-first offset (0=Mon..6=Sun).
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = endOfMonth(monthAnchor).getDate();
  const cells: Array<string | null> = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) =>
      toDateInput(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), i + 1)),
    ),
  ];

  const handleDayClick = (iso: string) => {
    if (!anchor) {
      setAnchor(iso);
      onSelectionChange({ from: iso, to: iso });
      return;
    }
    const range = anchor <= iso ? { from: anchor, to: iso } : { from: iso, to: anchor };
    onSelectionChange(range);
    setAnchor(null);
  };

  const isSelected = (iso: string) => selection && iso >= selection.from && iso <= selection.to;

  return (
    <div>
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMonthAnchor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-line text-ink-muted hover:bg-canvas"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="font-display min-w-[150px] text-center text-[17px] font-bold text-ink">
            {monthAnchor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
          </p>
          <button
            type="button"
            onClick={() => setMonthAnchor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-line text-ink-muted hover:bg-canvas"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="hidden items-center gap-4 text-[11px] text-ink-muted sm:flex">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm border border-line bg-surface" /> Open
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-primary-50" /> Selected
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-warning-bg" /> Low (1–2)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#F0F1F3]" /> Stop sell
          </span>
        </div>
      </div>

      {query.isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map((wd) => (
            <div
              key={wd}
              className="pb-1 text-center text-[10.5px] font-bold uppercase tracking-wide text-ink-muted"
            >
              {wd}
            </div>
          ))}
          {cells.map((iso, i) => {
            if (!iso) return <div key={`blank-${i}`} className="h-[74px] rounded-lg bg-canvas/60" />;
            const day = dayMap.get(iso);
            const dayNum = Number(iso.slice(8, 10));
            const noInventory = !day || day.totalUnits === 0;
            const selected = isSelected(iso);
            const low = day && !noInventory && day.unitsAvailable > 0 && day.unitsAvailable <= 2;

            return (
              <button
                key={iso}
                type="button"
                onClick={() => handleDayClick(iso)}
                className={cn(
                  'flex h-[74px] flex-col justify-between rounded-lg border p-1.5 text-left text-xs transition-colors',
                  selected
                    ? 'border-primary bg-primary text-white'
                    : day?.stopSell
                      ? 'border-line bg-[#F0F1F3] text-ink-muted'
                      : low
                        ? 'border-transparent bg-warning-bg text-warning-fg'
                        : noInventory
                          ? 'border-dashed border-line bg-canvas text-ink-muted'
                          : 'border-line bg-surface hover:border-primary-200 hover:bg-primary-50',
                )}
              >
                <span className={cn('font-bold', selected ? 'text-white' : 'text-ink')}>{dayNum}</span>
                {day?.stopSell ? (
                  <span className="text-[10px] font-bold">Stop sell</span>
                ) : !noInventory && day ? (
                  <span className={cn('text-[10.5px]', selected ? 'text-white/85' : undefined)}>
                    <b className="font-bold">{day.unitsAvailable}</b> left · {formatPrice(day.price)}
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-danger-fg">Not set</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

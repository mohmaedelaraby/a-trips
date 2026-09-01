'use client';

import * as React from 'react';
import { Minus, Plus } from 'lucide-react';
import { Field, Input } from '../../../shared/components/form-controls';
import { Button } from '../../../shared/components/button';
import { cn, formatDate, nightsBetween } from '../../../shared/lib/utils';
import { useBulkSetAvailability, useSetStopSell } from '../hooks/use-availability';
import type { DateRangeSelection } from './admin-availability-calendar';

export function BulkEditPanel({
  roomTypeId,
  selection,
  onClearSelection,
}: {
  roomTypeId: string;
  selection: DateRangeSelection | null;
  onClearSelection: () => void;
}) {
  const [totalUnits, setTotalUnits] = React.useState(1);
  const [priceOverride, setPriceOverride] = React.useState('');
  const [stopSell, setStopSell] = React.useState(false);

  const bulkSet = useBulkSetAvailability(roomTypeId);
  const setStopSellMutation = useSetStopSell(roomTypeId);

  const dates = selection
    ? Array.from(
        { length: nightsBetween(selection.from, selection.to) + 1 },
        (_, i) => i,
      )
    : [];

  const apply = () => {
    if (!selection) return;
    if (stopSell) {
      setStopSellMutation.mutate({ from: selection.from, to: selection.to, stopSell: true });
      return;
    }
    bulkSet.mutate({
      from: selection.from,
      to: selection.to,
      totalUnits,
      priceOverride: priceOverride ? Number(priceOverride) : null,
      stopSell: false,
    });
  };

  return (
    <div className="w-full shrink-0 overflow-hidden rounded-xl border-2 border-primary bg-surface shadow-lg lg:w-[340px]">
      <div className="bg-primary-50 px-[18px] py-3.5">
        <p className="font-display font-bold text-primary-700">
          {selection ? `Bulk edit · ${dates.length} date${dates.length === 1 ? '' : 's'}` : 'Bulk edit'}
        </p>
        <p className="mt-0.5 text-[12.5px] text-primary-800">
          {selection ? `${formatDate(selection.from)} – ${formatDate(selection.to)}` : 'Click a day, then another to select a range'}
        </p>
      </div>

      <div className="flex flex-col gap-3.5 p-[18px]">
        <div>
          <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-ink-muted">
            Available units per day
          </label>
          <div className="flex h-[42px] items-center justify-between rounded-lg border border-line pl-3 pr-1.5">
            <span className="text-[15px] font-bold text-ink">{totalUnits}</span>
            <span className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setTotalUnits((n) => Math.max(0, n - 1))}
                className="flex h-[26px] w-[26px] items-center justify-center rounded-full border border-line text-ink-muted"
                aria-label="Decrease"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setTotalUnits((n) => n + 1)}
                className="flex h-[26px] w-[26px] items-center justify-center rounded-full border border-primary text-primary"
                aria-label="Increase"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </span>
          </div>
        </div>

        <Field label="Price override" htmlFor="bulk-price" hint="Leave blank to use base price">
          <Input
            id="bulk-price"
            type="number"
            min={0}
            step="0.01"
            placeholder="Base price"
            value={priceOverride}
            onChange={(e) => setPriceOverride(e.target.value)}
          />
        </Field>

        <button
          type="button"
          onClick={() => setStopSell((s) => !s)}
          className="flex items-center justify-between rounded-lg bg-canvas px-3.5 py-2.5 text-left"
        >
          <span>
            <span className="block text-[13.5px] font-bold text-ink">Stop sell</span>
            <span className="block text-[11.5px] text-ink-muted">Closes these dates entirely</span>
          </span>
          <span
            className={cn(
              'flex h-[22px] w-10 items-center rounded-full px-[3px] transition-colors',
              stopSell ? 'justify-end bg-danger' : 'justify-start bg-line',
            )}
          >
            <span className="h-4 w-4 rounded-full bg-white" />
          </span>
        </button>

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            disabled={!selection}
            loading={bulkSet.isPending || setStopSellMutation.isPending}
            onClick={apply}
            block
          >
            {selection ? `Apply to ${dates.length} date${dates.length === 1 ? '' : 's'}` : 'Select dates to apply'}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!selection}
            onClick={onClearSelection}
            block
          >
            Clear selection
          </Button>
        </div>
      </div>
    </div>
  );
}

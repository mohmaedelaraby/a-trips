'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueries } from '@tanstack/react-query';
import { useAdminHotel, useAdminHotels } from '../../../modules/hotels/hooks/use-admin-hotels';
import {
  useAvailabilityCalendar,
  useBulkSetAvailability,
} from '../../../modules/availability/hooks/use-availability';
import { MonthGrid } from '../../../modules/availability/components/month-grid';
import type { AvailabilityCalendar } from '../../../modules/availability/interfaces/availability';
import {
  AdminTopbar,
  Panel,
  Segmented,
  Toggle,
  adminUi as ui,
} from '../../../modules/admin-dashboard/components/admin-ui';
import { apiGet } from '../../../shared/lib/api-client';
import { Skeleton } from '../../../shared/components/skeleton';
import { addDaysIso, cn, todayIso } from '../../../shared/lib/utils';
import styles from '../styles/admin-availability.module.css';

type ViewMode = 'month' | 'timeline';
type TimelineSpan = '14' | '30';

const LOW_THRESHOLD = 2;

function monthBounds(year: number, month: number) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return { from: `${year}-${pad(month + 1)}-01`, to: `${year}-${pad(month + 1)}-${pad(lastDay)}` };
}

function datesBetween(from: string, to: string) {
  const out: string[] = [];
  let cursor = from;
  while (cursor <= to) {
    out.push(cursor);
    cursor = addDaysIso(cursor, 1);
  }
  return out;
}

function shortDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export default function AdminAvailabilityPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const hotels = useAdminHotels({ pageSize: 100 });
  const hotelId = searchParams.get('hotelId') || hotels.data?.items[0]?.id || '';
  const hotel = useAdminHotel(hotelId);

  const roomTypes = React.useMemo(() => hotel.data?.roomTypes ?? [], [hotel.data]);
  const roomTypeId = searchParams.get('roomTypeId') || roomTypes[0]?.id || '';
  const roomType = roomTypes.find((room) => room.id === roomTypeId);

  const [view, setView] = React.useState<ViewMode>('month');
  const [span, setSpan] = React.useState<TimelineSpan>('14');
  const [cursor, setCursor] = React.useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [timelineStart, setTimelineStart] = React.useState(() => todayIso());
  const [selected, setSelected] = React.useState<string[]>([]);
  const [timelineRoomId, setTimelineRoomId] = React.useState<string | null>(null);

  const [units, setUnits] = React.useState(1);
  const [priceOverride, setPriceOverride] = React.useState('');
  const [stopSell, setStopSell] = React.useState(false);

  const { from: monthFrom, to: monthTo } = monthBounds(cursor.year, cursor.month);
  const timelineEnd = addDaysIso(timelineStart, Number(span) - 1);

  const monthQuery = useAvailabilityCalendar(view === 'month' ? roomTypeId : '', monthFrom, monthTo);

  // The timeline needs every room type's calendar for the same window.
  const timelineQueries = useQueries({
    queries:
      view === 'timeline'
        ? roomTypes.map((room) => ({
            queryKey: ['admin', 'availability', room.id, timelineStart, timelineEnd],
            queryFn: () =>
              apiGet<AvailabilityCalendar>(`/admin/room-types/${room.id}/availability`, {
                from: timelineStart,
                to: timelineEnd,
              }),
            enabled: room.status === 'ACTIVE',
          }))
        : [],
  });

  const editRoomId = view === 'month' ? roomTypeId : timelineRoomId;
  const bulk = useBulkSetAvailability(editRoomId ?? '');

  const editRoom = roomTypes.find((room) => room.id === editRoomId);

  // Reset the draft whenever a fresh selection starts.
  React.useEffect(() => {
    if (selected.length === 0) return;
    setUnits(editRoom?.totalUnits ?? 1);
    setPriceOverride('');
    setStopSell(false);
  }, [selected.length === 0, editRoomId]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleDate = (date: string, extend: boolean, roomId?: string) => {
    if (roomId && roomId !== timelineRoomId) {
      setTimelineRoomId(roomId);
      setSelected([date]);
      return;
    }
    setSelected((previous) => {
      if (extend && previous.length > 0) {
        const anchor = previous[0];
        const [from, to] = anchor <= date ? [anchor, date] : [date, anchor];
        return datesBetween(from, to);
      }
      return previous.includes(date) && previous.length === 1 ? [] : [date];
    });
  };

  const applyToSelection = (overrides?: { stopSell?: boolean; totalUnits?: number }) => {
    if (!editRoomId || selected.length === 0) return;
    const sorted = [...selected].sort();
    bulk.mutate(
      {
        from: sorted[0],
        to: sorted[sorted.length - 1],
        totalUnits: overrides?.totalUnits ?? units,
        priceOverride: priceOverride.trim() ? Number(priceOverride) : null,
        stopSell: overrides?.stopSell ?? stopSell,
      },
      { onSuccess: () => setSelected([]) },
    );
  };

  const monthDays = monthQuery.data?.days ?? [];
  const summary = React.useMemo(() => {
    const open = monthDays.filter((day) => day.isSet && !day.stopSell).length;
    const stopped = monthDays.filter((day) => day.stopSell).length;
    const notSet = monthDays.filter((day) => !day.isSet).length;
    const priced = monthDays.filter((day) => day.isSet);
    const avg = priced.length
      ? Math.round(priced.reduce((total, day) => total + day.price, 0) / priced.length)
      : 0;
    return { open, stopped, notSet, avg, total: monthDays.length };
  }, [monthDays]);

  const monthLabel = new Date(Date.UTC(cursor.year, cursor.month, 1)).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });

  const timelineDates = datesBetween(timelineStart, timelineEnd);

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    if (key === 'hotelId') params.delete('roomTypeId');
    router.replace(`/admin/availability?${params.toString()}`);
    setSelected([]);
  };

  return (
    <>
      <AdminTopbar
        title={view === 'month' ? (roomType?.name ?? 'Availability') : 'Availability — all room types'}
        breadcrumb={
          <>
            <Link href="/admin/hotels">{hotel.data?.name ?? 'Hotels'}</Link>
            {' / Availability'}
          </>
        }
      >
        <select
          className={ui.select}
          value={hotelId}
          onChange={(event) => setParam('hotelId', event.target.value)}
          aria-label="Choose hotel"
        >
          {hotels.data?.items.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>

        {view === 'month' ? (
          <select
            className={ui.select}
            value={roomTypeId}
            onChange={(event) => setParam('roomTypeId', event.target.value)}
            aria-label="Choose room type"
          >
            {roomTypes.map((option) => (
              <option key={option.id} value={option.id}>
                Room type: {option.name}
              </option>
            ))}
          </select>
        ) : (
          <Segmented<TimelineSpan>
            value={span}
            onChange={setSpan}
            options={[
              { value: '14', label: '14 days' },
              { value: '30', label: '30 days' },
            ]}
          />
        )}

        <Segmented<ViewMode>
          value={view}
          onChange={(next) => {
            setView(next);
            setSelected([]);
          }}
          options={[
            { value: 'month', label: 'Month' },
            { value: 'timeline', label: 'Timeline' },
          ]}
        />
      </AdminTopbar>

      <div className={ui.body}>
        {roomTypes.length === 0 ? (
          <Panel>
            <p className={styles.emptyHint}>Add a room type before managing availability.</p>
          </Panel>
        ) : view === 'month' ? (
          <div className={styles.layout}>
            <Panel>
              <div className={styles.calendarBody}>
                <div className={styles.calendarHead}>
                  <div className={styles.monthNav}>
                    <button
                      type="button"
                      className={styles.monthBtn}
                      aria-label="Previous month"
                      onClick={() =>
                        setCursor(({ year, month }) =>
                          month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 },
                        )
                      }
                    >
                      ‹
                    </button>
                    <h2 className={styles.monthTitle}>{monthLabel}</h2>
                    <button
                      type="button"
                      className={styles.monthBtn}
                      aria-label="Next month"
                      onClick={() =>
                        setCursor(({ year, month }) =>
                          month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 },
                        )
                      }
                    >
                      ›
                    </button>
                  </div>

                  <div className={styles.legend}>
                    <span className={styles.legendItem}>
                      <span className={styles.legendSwatch} /> Open
                    </span>
                    <span className={styles.legendItem}>
                      <span className={cn(styles.legendSwatch, styles.legendSelected)} /> Selected
                    </span>
                    <span className={styles.legendItem}>
                      <span className={cn(styles.legendSwatch, styles.legendLow)} /> Low (1–2)
                    </span>
                    <span className={styles.legendItem}>
                      <span className={cn(styles.legendSwatch, styles.legendStop)} /> Stop sell
                    </span>
                  </div>
                </div>

                {monthQuery.isLoading ? (
                  <Skeleton className="mt-6 h-96 w-full" />
                ) : (
                  <MonthGrid
                    year={cursor.year}
                    month={cursor.month}
                    days={monthDays}
                    selected={selected}
                    onSelect={(date, extend) => toggleDate(date, extend)}
                  />
                )}
              </div>
            </Panel>

            <div className={styles.rail}>
              {selected.length > 0 ? (
                <div className={styles.bulkPanel}>
                  <div className={styles.bulkHead}>
                    <p className={styles.bulkTitle}>
                      Bulk edit · {selected.length} date{selected.length === 1 ? '' : 's'}
                    </p>
                    <p className={styles.bulkRange}>
                      {shortDate([...selected].sort()[0])} —{' '}
                      {shortDate([...selected].sort()[selected.length - 1])}
                    </p>
                  </div>

                  <div className={styles.bulkBody}>
                    <div>
                      <span className={ui.fieldLabel}>Available units per day</span>
                      <div className={styles.unitsRow}>
                        <span className={styles.unitsValue}>{units}</span>
                        <span className={styles.unitsControls}>
                          <button
                            type="button"
                            className={styles.stepBtn}
                            disabled={units <= 0}
                            onClick={() => setUnits((value) => Math.max(0, value - 1))}
                            aria-label="Decrease units"
                          >
                            −
                          </button>
                          <button
                            type="button"
                            className={cn(styles.stepBtn, styles.stepBtnPlus)}
                            disabled={units >= (roomType?.totalUnits ?? 99)}
                            onClick={() => setUnits((value) => value + 1)}
                            aria-label="Increase units"
                          >
                            +
                          </button>
                        </span>
                      </div>
                      <p className={ui.fieldHint}>
                        Room type has {roomType?.totalUnits ?? 0} physical units.
                      </p>
                    </div>

                    <div>
                      <span className={ui.fieldLabel}>Price override (optional)</span>
                      <input
                        className={ui.input}
                        inputMode="decimal"
                        placeholder={`Base $${Math.round(roomType?.basePrice ?? 0)} — leave blank to keep`}
                        value={priceOverride}
                        onChange={(event) => setPriceOverride(event.target.value)}
                      />
                    </div>

                    <div className={styles.stopSellRow}>
                      <div>
                        <p className={styles.stopSellLabel}>Stop sell</p>
                        <p className={styles.stopSellHint}>Closes these dates entirely</p>
                      </div>
                      <Toggle checked={stopSell} onChange={setStopSell} label="Stop sell" />
                    </div>

                    <button
                      type="button"
                      className={cn(ui.btn, ui.btnPrimary, ui.btnBlock, ui.btnLg)}
                      disabled={bulk.isPending}
                      onClick={() => applyToSelection()}
                    >
                      {bulk.isPending
                        ? 'Applying…'
                        : `Apply to ${selected.length} date${selected.length === 1 ? '' : 's'}`}
                    </button>
                    <button
                      type="button"
                      className={cn(ui.btn, ui.btnGhost, ui.btnBlock, ui.btnLg)}
                      onClick={() => setSelected([])}
                    >
                      Clear selection
                    </button>
                  </div>
                </div>
              ) : null}

              <Panel>
                <div className={styles.railBody}>
                  <h2 className={styles.railTitle}>Quick actions</h2>
                  <div className={styles.quickList}>
                    <button
                      type="button"
                      className={styles.quickBtn}
                      disabled={bulk.isPending || !roomType}
                      onClick={() =>
                        bulk.mutate({
                          from: monthFrom,
                          to: monthTo,
                          daysOfWeek: [1, 2, 3, 4, 5],
                          totalUnits: roomType?.totalUnits ?? 1,
                          stopSell: false,
                        })
                      }
                    >
                      Open all weekdays this month
                    </button>
                    <button
                      type="button"
                      className={styles.quickBtn}
                      disabled={bulk.isPending || !roomType}
                      onClick={() => {
                        const next = monthBounds(
                          cursor.month === 11 ? cursor.year + 1 : cursor.year,
                          cursor.month === 11 ? 0 : cursor.month + 1,
                        );
                        bulk.mutate({
                          from: next.from,
                          to: next.to,
                          totalUnits: roomType?.totalUnits ?? 1,
                          stopSell: false,
                        });
                      }}
                    >
                      Copy {monthLabel.split(' ')[0]} → next month
                    </button>
                    <button
                      type="button"
                      className={cn(styles.quickBtn, styles.quickBtnDanger)}
                      disabled={bulk.isPending || !roomType}
                      onClick={() => {
                        if (!window.confirm(`Stop sell every date in ${monthLabel}?`)) return;
                        bulk.mutate({
                          from: monthFrom,
                          to: monthTo,
                          totalUnits: roomType?.totalUnits ?? 1,
                          stopSell: true,
                        });
                      }}
                    >
                      Stop sell whole month
                    </button>
                  </div>
                </div>
              </Panel>

              <Panel>
                <div className={styles.railBody}>
                  <h2 className={styles.railTitle}>{monthLabel.split(' ')[0]} summary</h2>
                  <div className={styles.summaryList}>
                    <div className={styles.summaryRow}>
                      <span>Open days</span>
                      <span className={styles.summaryValue}>
                        {summary.open} of {summary.total}
                      </span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span>Stop sell</span>
                      <span className={styles.summaryValue}>{summary.stopped}</span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span>Not set</span>
                      <span className={cn(styles.summaryValue, summary.notSet > 0 && styles.summaryDanger)}>
                        {summary.notSet}
                      </span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span>Avg price</span>
                      <span className={styles.summaryValue}>${summary.avg}</span>
                    </div>
                  </div>
                </div>
              </Panel>
            </div>
          </div>
        ) : (
          <>
            <Panel>
              <div className={ui.panelHead}>
                <div className={styles.monthNav}>
                  <button
                    type="button"
                    className={styles.monthBtn}
                    aria-label="Previous period"
                    onClick={() => setTimelineStart((value) => addDaysIso(value, -Number(span)))}
                  >
                    ‹
                  </button>
                  <span className={styles.monthTitle}>
                    {shortDate(timelineStart)} – {shortDate(timelineEnd)}
                  </span>
                  <button
                    type="button"
                    className={styles.monthBtn}
                    aria-label="Next period"
                    onClick={() => setTimelineStart((value) => addDaysIso(value, Number(span)))}
                  >
                    ›
                  </button>
                </div>
              </div>

              <div className={styles.timelineWrap}>
                <table className={styles.timeline}>
                  <thead>
                    <tr>
                      <th className={styles.timelineRoomHead}>Room type</th>
                      {timelineDates.map((date) => {
                        const day = new Date(`${date}T00:00:00`);
                        return (
                          <th key={date} className={styles.timelineDayHead}>
                            {day.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase()}
                            <span className={styles.timelineDayNumber}>{day.getDate()}</span>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {roomTypes.map((room, roomIndex) => {
                      if (room.status !== 'ACTIVE') {
                        return (
                          <tr key={room.id} className={styles.timelineInactiveRow}>
                            <td className={styles.timelineRoomCell}>
                              <p className={styles.timelineRoomName}>{room.name}</p>
                              <p className={cn(styles.timelineRoomMeta, styles.timelineRoomInactive)}>
                                Inactive{room.basePrice ? '' : ' · no price set'}
                              </p>
                            </td>
                            <td className={styles.timelineInactiveNote} colSpan={timelineDates.length}>
                              Not on sale — activate the room type to manage dates
                            </td>
                          </tr>
                        );
                      }

                      const calendar = timelineQueries[roomIndex]?.data;
                      const byDate = new Map((calendar?.days ?? []).map((day) => [day.date, day]));

                      return (
                        <tr key={room.id}>
                          <td className={styles.timelineRoomCell}>
                            <p className={styles.timelineRoomName}>{room.name}</p>
                            <p className={styles.timelineRoomMeta}>
                              {room.totalUnits} units · ${Math.round(room.basePrice)} base
                            </p>
                          </td>
                          {timelineDates.map((date) => {
                            const day = byDate.get(date);
                            const isSelected = timelineRoomId === room.id && selected.includes(date);
                            const stop = Boolean(day?.stopSell);
                            const low =
                              !stop && day?.isSet && (day?.unitsAvailable ?? 0) <= LOW_THRESHOLD;
                            return (
                              <td
                                key={date}
                                role="button"
                                tabIndex={0}
                                onClick={(event) => toggleDate(date, event.shiftKey, room.id)}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    toggleDate(date, event.shiftKey, room.id);
                                  }
                                }}
                                className={cn(
                                  styles.timelineCell,
                                  low && styles.timelineCellLow,
                                  stop && styles.timelineCellStop,
                                  isSelected && styles.timelineCellSelected,
                                )}
                              >
                                {stop ? (
                                  <span className={styles.timelineUnits}>STOP</span>
                                ) : !day?.isSet ? (
                                  <span className={styles.timelineUnits}>—</span>
                                ) : (
                                  <>
                                    <span className={styles.timelineUnits}>{day.unitsAvailable}</span>
                                    <span className={styles.timelinePrice}>{Math.round(day.price)}</span>
                                  </>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>

            {selected.length > 0 && editRoom ? (
              <div className={styles.footerEditor}>
                <div className={styles.footerRoom}>
                  <p className={styles.footerRoomName}>{editRoom.name}</p>
                  <p className={styles.footerRoomMeta}>
                    {shortDate([...selected].sort()[0])} – {shortDate([...selected].sort().at(-1)!)} ·{' '}
                    {selected.length} day{selected.length === 1 ? '' : 's'} selected
                  </p>
                </div>

                <span className={styles.footerField}>
                  Units
                  <span className={styles.footerUnits}>
                    <button
                      type="button"
                      className={styles.footerStep}
                      onClick={() => setUnits((value) => Math.max(0, value - 1))}
                      aria-label="Decrease units"
                    >
                      −
                    </button>
                    <span className={styles.footerUnitsValue}>{units}</span>
                    <button
                      type="button"
                      className={cn(styles.footerStep, styles.footerStepPlus)}
                      onClick={() => setUnits((value) => value + 1)}
                      aria-label="Increase units"
                    >
                      +
                    </button>
                  </span>
                </span>

                <span className={styles.footerField}>
                  Price
                  <input
                    className={styles.footerPrice}
                    inputMode="decimal"
                    placeholder={`$ ${Math.round(editRoom.basePrice)}`}
                    value={priceOverride}
                    onChange={(event) => setPriceOverride(event.target.value)}
                    aria-label="Price override"
                  />
                </span>

                <span className={styles.footerField}>
                  Stop sell
                  <Toggle checked={stopSell} onChange={setStopSell} label="Stop sell" />
                </span>

                <span className={styles.footerSpacer}>
                  <button type="button" className={styles.footerClear} onClick={() => setSelected([])}>
                    Clear
                  </button>
                  <button
                    type="button"
                    className={styles.footerApply}
                    disabled={bulk.isPending}
                    onClick={() => applyToSelection()}
                  >
                    {bulk.isPending
                      ? 'Applying…'
                      : `Apply to ${selected.length} day${selected.length === 1 ? '' : 's'}`}
                  </button>
                </span>
              </div>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}

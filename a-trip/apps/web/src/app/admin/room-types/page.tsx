'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';
import { useAdminHotel, useAdminHotels } from '../../../modules/hotels/hooks/use-admin-hotels';
import { useCreateRoomType, useSaveRoomType } from '../../../modules/hotels/hooks/use-admin-room-types';
import {
  AdminTopbar,
  Panel,
  Pill,
  Toggle,
  adminUi as ui,
} from '../../../modules/admin-dashboard/components/admin-ui';
import { Skeleton } from '../../../shared/components/skeleton';
import { cn, formatPrice } from '../../../shared/lib/utils';
import type { RoomType } from '../../../modules/hotels/interfaces/hotel';
import styles from '../styles/admin-room-types.module.css';

interface Draft {
  id: string | null;
  name: string;
  description: string;
  capacityAdults: number;
  capacityChildren: number;
  numOfBeds: number;
  totalUnits: number;
  sizeSqm: string;
  basePrice: string;
  active: boolean;
}

function draftFrom(roomType: RoomType): Draft {
  return {
    id: roomType.id,
    name: roomType.name,
    description: roomType.description ?? '',
    capacityAdults: roomType.capacityAdults,
    capacityChildren: roomType.capacityChildren,
    numOfBeds: roomType.numOfBeds,
    totalUnits: roomType.totalUnits,
    sizeSqm: roomType.sizeSqm?.toString() ?? '',
    basePrice: roomType.basePrice ? roomType.basePrice.toString() : '',
    active: roomType.status === 'ACTIVE',
  };
}

const BLANK: Draft = {
  id: null,
  name: '',
  description: '',
  capacityAdults: 2,
  capacityChildren: 0,
  numOfBeds: 1,
  totalUnits: 1,
  sizeSqm: '',
  basePrice: '',
  active: true,
};

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
}) {
  return (
    <div>
      <span className={ui.fieldLabel}>{label}</span>
      <div className={styles.stepper}>
        <span className={styles.stepperValue}>{value}</span>
        <span className={styles.stepperControls}>
          <button
            type="button"
            className={styles.stepBtn}
            disabled={value <= min}
            onClick={() => onChange(value - 1)}
            aria-label={`Decrease ${label}`}
          >
            −
          </button>
          <button
            type="button"
            className={cn(styles.stepBtn, styles.stepBtnPlus)}
            disabled={value >= max}
            onClick={() => onChange(value + 1)}
            aria-label={`Increase ${label}`}
          >
            +
          </button>
        </span>
      </div>
    </div>
  );
}

export default function AdminRoomTypesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hotelId = searchParams.get('hotelId') ?? '';

  const hotels = useAdminHotels({ pageSize: 100 });
  const activeHotelId = hotelId || hotels.data?.items[0]?.id || '';
  const hotel = useAdminHotel(activeHotelId);

  const save = useSaveRoomType(activeHotelId);
  const create = useCreateRoomType(activeHotelId);

  const [draft, setDraft] = React.useState<Draft | null>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((previous) => (previous ? { ...previous, [key]: value } : previous));

  const roomTypes = hotel.data?.roomTypes ?? [];

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft || draft.name.trim().length < 2) return;

    const payload = {
      name: draft.name.trim(),
      description: draft.description.trim() || undefined,
      capacityAdults: draft.capacityAdults,
      capacityChildren: draft.capacityChildren,
      numOfBeds: draft.numOfBeds,
      totalUnits: draft.totalUnits,
      sizeSqm: draft.sizeSqm.trim() ? Number(draft.sizeSqm) : undefined,
      basePrice: draft.basePrice.trim() ? Number(draft.basePrice) : 0,
      status: draft.active ? ('ACTIVE' as const) : ('INACTIVE' as const),
    };

    if (draft.id) {
      save.mutate({ id: draft.id, ...payload }, { onSuccess: () => setDraft(null) });
    } else {
      create.mutate(payload, { onSuccess: () => setDraft(null) });
    }
  };

  return (
    <>
      <AdminTopbar
        title="Room types"
        breadcrumb={
          <>
            <Link href="/admin/hotels">Hotels</Link>
            {hotel.data ? ` / ${hotel.data.name} /` : ' /'}
          </>
        }
      >
        <select
          className={ui.select}
          value={activeHotelId}
          onChange={(event) => router.replace(`/admin/room-types?hotelId=${event.target.value}`)}
          aria-label="Choose hotel"
        >
          {hotels.data?.items.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={cn(ui.btn, ui.btnPrimary)}
          onClick={() => setDraft({ ...BLANK })}
          disabled={!activeHotelId}
        >
          + Add room type
        </button>
      </AdminTopbar>

      <div className={ui.body}>
        <div className={styles.layout}>
          <Panel>
            <div className={ui.tableWrap}>
              <table className={ui.table}>
                <thead>
                  <tr>
                    <th>Room type</th>
                    <th>Capacity</th>
                    <th>Size</th>
                    <th>Base price</th>
                    <th>Status</th>
                    <th className={ui.numeric}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {hotel.isLoading ? (
                    Array.from({ length: 4 }, (_, i) => (
                      <tr key={i}>
                        <td colSpan={6}>
                          <Skeleton className="h-8 w-full" />
                        </td>
                      </tr>
                    ))
                  ) : roomTypes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className={ui.emptyRow}>
                        This hotel has no room types yet.
                      </td>
                    </tr>
                  ) : (
                    roomTypes.map((roomType) => {
                      const editing = draft?.id === roomType.id;
                      const inactive = roomType.status !== 'ACTIVE';
                      const missingPrice = !roomType.basePrice;
                      return (
                        <tr key={roomType.id} className={cn(editing && styles.rowEditing)}>
                          <td>
                            <div className={styles.roomCell}>
                              <span className={styles.roomThumb} />
                              <div>
                                <p className={cn(styles.roomName, inactive && styles.roomNameMuted)}>
                                  {roomType.name}
                                </p>
                                {missingPrice ? (
                                  <p className={styles.roomWarning}>Base price missing</p>
                                ) : (
                                  <p className={styles.roomMeta}>
                                    {roomType.numOfBeds} bed{roomType.numOfBeds === 1 ? '' : 's'} ·{' '}
                                    {roomType.totalUnits} units
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            {roomType.capacityAdults} ad · {roomType.capacityChildren} ch
                          </td>
                          <td>{roomType.sizeSqm ? `${roomType.sizeSqm} m²` : '—'}</td>
                          <td className={ui.cellStrong}>
                            {roomType.basePrice ? formatPrice(roomType.basePrice, true) : '—'}
                          </td>
                          <td>
                            {editing ? (
                              <Pill tone="success">Editing</Pill>
                            ) : inactive ? (
                              <Pill tone="neutral">Inactive</Pill>
                            ) : (
                              <Pill tone="success">Active</Pill>
                            )}
                          </td>
                          <td>
                            <div className={ui.actionsCell}>
                              <button
                                type="button"
                                className={cn(ui.actionLink, editing && ui.actionLinkDisabled)}
                                onClick={() => setDraft(draftFrom(roomType))}
                              >
                                Edit
                              </button>
                              <Link
                                href={`/admin/availability?hotelId=${activeHotelId}&roomTypeId=${roomType.id}`}
                                className={cn(ui.actionLink, inactive && ui.actionLinkDisabled)}
                                aria-disabled={inactive}
                                tabIndex={inactive ? -1 : undefined}
                              >
                                Dates
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Panel>

          {draft ? (
            <form className={styles.panel} onSubmit={submit}>
              <div className={styles.panelHead}>
                <h2 className={styles.panelTitle}>{draft.id ? 'Edit room type' : 'Add room type'}</h2>
                <button
                  type="button"
                  className={styles.closeBtn}
                  onClick={() => setDraft(null)}
                  aria-label="Close panel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className={styles.panelBody}>
                <div>
                  <label htmlFor="rt-name" className={ui.fieldLabel}>
                    Name
                  </label>
                  <input
                    id="rt-name"
                    className={ui.input}
                    value={draft.name}
                    onChange={(event) => set('name', event.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="rt-description" className={ui.fieldLabel}>
                    Description
                  </label>
                  <textarea
                    id="rt-description"
                    className={ui.textarea}
                    value={draft.description}
                    onChange={(event) => set('description', event.target.value)}
                  />
                </div>

                <div className={styles.grid2}>
                  <Stepper
                    label="Adults"
                    value={draft.capacityAdults}
                    min={1}
                    max={20}
                    onChange={(next) => set('capacityAdults', next)}
                  />
                  <Stepper
                    label="Children"
                    value={draft.capacityChildren}
                    min={0}
                    max={20}
                    onChange={(next) => set('capacityChildren', next)}
                  />
                </div>

                <div className={styles.grid3}>
                  <div>
                    <label htmlFor="rt-beds" className={ui.fieldLabel}>
                      Beds
                    </label>
                    <input
                      id="rt-beds"
                      className={ui.input}
                      inputMode="numeric"
                      value={draft.numOfBeds}
                      onChange={(event) => set('numOfBeds', Number(event.target.value) || 1)}
                    />
                  </div>
                  <div>
                    <label htmlFor="rt-size" className={ui.fieldLabel}>
                      Size m²
                    </label>
                    <input
                      id="rt-size"
                      className={ui.input}
                      inputMode="decimal"
                      value={draft.sizeSqm}
                      onChange={(event) => set('sizeSqm', event.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="rt-units" className={ui.fieldLabel}>
                      Units
                    </label>
                    <input
                      id="rt-units"
                      className={ui.input}
                      inputMode="numeric"
                      value={draft.totalUnits}
                      onChange={(event) => set('totalUnits', Number(event.target.value) || 1)}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="rt-price" className={ui.fieldLabel}>
                    Base price / night (USD)
                  </label>
                  <div className={styles.priceInput}>
                    <span className={styles.priceSymbol}>$</span>
                    <input
                      id="rt-price"
                      className={cn(ui.input, styles.priceField)}
                      inputMode="decimal"
                      value={draft.basePrice}
                      onChange={(event) => set('basePrice', event.target.value)}
                    />
                  </div>
                  <p className={ui.fieldHint}>Date-level overrides are set in the availability calendar.</p>
                </div>

                <div className={styles.activeRow}>
                  Active
                  <Toggle checked={draft.active} onChange={(next) => set('active', next)} label="Active" />
                </div>

                <div className={styles.panelActions}>
                  <button
                    type="submit"
                    className={cn(ui.btn, ui.btnPrimary, ui.btnBlock, ui.btnLg)}
                    disabled={save.isPending || create.isPending}
                  >
                    {save.isPending || create.isPending ? 'Saving…' : 'Save room type'}
                  </button>
                  <button
                    type="button"
                    className={cn(ui.btn, ui.btnGhost, ui.btnBlock, ui.btnLg)}
                    onClick={() => setDraft(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          ) : null}
        </div>
      </div>
    </>
  );
}

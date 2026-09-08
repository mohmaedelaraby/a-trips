'use client';

import * as React from 'react';
import { Plus, X } from 'lucide-react';
import { adminUi as ui } from '../../admin-dashboard/components/admin-ui';
import { addDaysIso, cn, todayIso } from '../../../shared/lib/utils';
import styles from '../styles/hotel-editor.module.css';

/** A room type typed into the create form, before the hotel exists to hang it on. */
export interface DraftRoomType {
  /** Local key only — the server assigns the real id. */
  key: string;
  name: string;
  description: string;
  capacityAdults: number;
  capacityChildren: number;
  numOfBeds: number;
  /** Physical rooms of this type; also the nightly units opened for sale. */
  totalUnits: number;
  basePrice: string;
}

/** The window of dates opened for sale on every drafted room type. */
export interface DraftAvailability {
  from: string;
  to: string;
}

/** 90 days matches the horizon the admin gaps report checks against. */
export const DEFAULT_AVAILABILITY_DAYS = 90;

export function newDraftRoom(): DraftRoomType {
  return {
    key:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `room-${Math.random()}`,
    name: '',
    description: '',
    capacityAdults: 2,
    capacityChildren: 0,
    numOfBeds: 1,
    totalUnits: 5,
    basePrice: '',
  };
}

export function defaultDraftAvailability(): DraftAvailability {
  // Opens from tomorrow: today is usually already past the hotel's cut-off, and
  // an admin can always widen the range afterwards on the calendar screen.
  return { from: addDaysIso(todayIso(), 1), to: addDaysIso(todayIso(), DEFAULT_AVAILABILITY_DAYS) };
}

/**
 * Rooms and their opening dates, collected while creating a hotel.
 *
 * A hotel with no room type has nothing to sell, and a room type with no
 * availability rows reads to a guest as "no rooms available" — indistinguishable
 * from sold out. Both used to be separate screens visited after saving, which is
 * why hotels kept going live invisible. Collecting them here means finishing
 * this form produces a hotel guests can actually book.
 */
export function DraftRoomsPanel({
  rooms,
  onRoomsChange,
  availability,
  onAvailabilityChange,
  errors,
}: {
  rooms: DraftRoomType[];
  onRoomsChange: (rooms: DraftRoomType[]) => void;
  availability: DraftAvailability;
  onAvailabilityChange: (availability: DraftAvailability) => void;
  errors?: Record<string, string>;
}) {
  const update = (key: string, patch: Partial<DraftRoomType>) =>
    onRoomsChange(rooms.map((room) => (room.key === key ? { ...room, ...patch } : room)));

  const nights = React.useMemo(() => {
    const from = Date.parse(`${availability.from}T00:00:00Z`);
    const to = Date.parse(`${availability.to}T00:00:00Z`);
    if (Number.isNaN(from) || Number.isNaN(to) || to < from) return 0;
    return Math.round((to - from) / 86_400_000) + 1;
  }, [availability.from, availability.to]);

  return (
    <div className={styles.panelBody}>
      <div className={styles.photosHead}>
        <h2 className={styles.panelTitle}>Rooms &amp; availability</h2>
        <span className={styles.photosHint}>Needed before guests can book</span>
      </div>

      {rooms.length === 0 ? (
        <p className={styles.photosHint}>
          No rooms yet. A hotel with no rooms is saved but cannot be booked.
        </p>
      ) : null}

      {rooms.map((room, index) => (
        <div key={room.key} className={styles.draftRoom}>
          <div className={styles.draftRoomHead}>
            <span className={styles.draftRoomTitle}>Room {index + 1}</span>
            <button
              type="button"
              className={styles.draftRoomRemove}
              onClick={() => onRoomsChange(rooms.filter((item) => item.key !== room.key))}
              aria-label={`Remove room ${index + 1}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className={styles.fields}>
            <div>
              <label htmlFor={`room-name-${room.key}`} className={ui.fieldLabel}>
                Room name
              </label>
              <input
                id={`room-name-${room.key}`}
                className={ui.input}
                value={room.name}
                placeholder="Deluxe double"
                onChange={(event) => update(room.key, { name: event.target.value })}
              />
              {errors?.[`room-${room.key}-name`] ? (
                <p className={ui.fieldError}>{errors[`room-${room.key}-name`]}</p>
              ) : null}
            </div>

            <div className={styles.fieldRow}>
              <div>
                <label htmlFor={`room-price-${room.key}`} className={ui.fieldLabel}>
                  Price per night (USD)
                </label>
                <input
                  id={`room-price-${room.key}`}
                  className={ui.input}
                  inputMode="decimal"
                  value={room.basePrice}
                  placeholder="120"
                  onChange={(event) => update(room.key, { basePrice: event.target.value })}
                />
                {errors?.[`room-${room.key}-price`] ? (
                  <p className={ui.fieldError}>{errors[`room-${room.key}-price`]}</p>
                ) : null}
              </div>
              <div>
                <label htmlFor={`room-units-${room.key}`} className={ui.fieldLabel}>
                  Rooms of this type
                </label>
                <input
                  id={`room-units-${room.key}`}
                  type="number"
                  min={1}
                  max={999}
                  className={ui.input}
                  value={room.totalUnits}
                  onChange={(event) =>
                    update(room.key, { totalUnits: Math.max(1, Number(event.target.value) || 1) })
                  }
                />
              </div>
            </div>

            <div className={styles.fieldRow}>
              <div>
                <label htmlFor={`room-adults-${room.key}`} className={ui.fieldLabel}>
                  Adults
                </label>
                <input
                  id={`room-adults-${room.key}`}
                  type="number"
                  min={1}
                  max={20}
                  className={ui.input}
                  value={room.capacityAdults}
                  onChange={(event) =>
                    update(room.key, {
                      capacityAdults: Math.max(1, Number(event.target.value) || 1),
                    })
                  }
                />
              </div>
              <div>
                <label htmlFor={`room-children-${room.key}`} className={ui.fieldLabel}>
                  Children
                </label>
                <input
                  id={`room-children-${room.key}`}
                  type="number"
                  min={0}
                  max={20}
                  className={ui.input}
                  value={room.capacityChildren}
                  onChange={(event) =>
                    update(room.key, {
                      capacityChildren: Math.max(0, Number(event.target.value) || 0),
                    })
                  }
                />
              </div>
              <div>
                <label htmlFor={`room-beds-${room.key}`} className={ui.fieldLabel}>
                  Beds
                </label>
                <input
                  id={`room-beds-${room.key}`}
                  type="number"
                  min={1}
                  max={20}
                  className={ui.input}
                  value={room.numOfBeds}
                  onChange={(event) =>
                    update(room.key, { numOfBeds: Math.max(1, Number(event.target.value) || 1) })
                  }
                />
              </div>
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        className={cn(ui.btn, ui.btnGhost, styles.draftRoomAdd)}
        onClick={() => onRoomsChange([...rooms, newDraftRoom()])}
      >
        <Plus className="h-4 w-4" /> Add a room type
      </button>

      {rooms.length > 0 ? (
        <>
          <div className={styles.draftDivider} />
          <div className={styles.fields}>
            <span className={ui.fieldLabel}>Open these dates for sale</span>
            <div className={styles.fieldRow}>
              <div>
                <label htmlFor="availability-from" className={ui.fieldLabel}>
                  From
                </label>
                <input
                  id="availability-from"
                  type="date"
                  className={ui.input}
                  value={availability.from}
                  onChange={(event) =>
                    onAvailabilityChange({ ...availability, from: event.target.value })
                  }
                />
              </div>
              <div>
                <label htmlFor="availability-to" className={ui.fieldLabel}>
                  To
                </label>
                <input
                  id="availability-to"
                  type="date"
                  className={ui.input}
                  value={availability.to}
                  onChange={(event) =>
                    onAvailabilityChange({ ...availability, to: event.target.value })
                  }
                />
              </div>
            </div>
            {errors?.availability ? (
              <p className={ui.fieldError}>{errors.availability}</p>
            ) : (
              <p className={styles.photosHint}>
                {nights > 0
                  ? `${nights} night${nights === 1 ? '' : 's'} opened on every room above. You can adjust individual dates on the calendar afterwards.`
                  : 'Choose an end date on or after the start date.'}
              </p>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

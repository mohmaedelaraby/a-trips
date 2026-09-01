export interface AvailabilityDay {
  date: string;
  /** False when no calendar row exists — the date was never opened for sale. */
  isSet: boolean;
  totalUnits: number;
  bookedUnits: number;
  unitsAvailable: number;
  price: number;
  priceOverride: number | null;
  stopSell: boolean;
}

export interface AvailabilityCalendar {
  roomTypeId: string;
  from: string;
  to: string;
  days: AvailabilityDay[];
}

export interface BulkAvailabilityPayload {
  from: string;
  to: string;
  daysOfWeek?: number[];
  totalUnits: number;
  priceOverride?: number | null;
  stopSell?: boolean;
}

export interface StopSellPayload {
  from: string;
  to: string;
  daysOfWeek?: number[];
  stopSell: boolean;
}

export interface BulkAvailabilityResult {
  datesAffected: number;
  from: string;
  to: string;
}

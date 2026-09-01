export interface NightAssessment {
  date: string;
  totalUnits: number;
  bookedUnits: number;
  unitsAvailable: number;
  price: number;
  stopSell: boolean;
}

export type UnavailableReason = 'STOP_SELL' | 'NO_INVENTORY' | 'SOLD_OUT' | 'INACTIVE' | 'CAPACITY';

export interface RangeAssessment {
  checkIn: string;
  checkOut: string;
  nights: number;
  bookable: boolean;
  minUnitsAvailable: number;
  totalPrice: number | null;
  averageNightlyPrice: number | null;
  reason?: UnavailableReason;
  nightsDetail: NightAssessment[];
}

import type { RoomTypeStatus } from '../../../shared/interfaces/api';

export interface CreateRoomTypePayload {
  name: string;
  description?: string;
  capacityAdults: number;
  capacityChildren?: number;
  numOfBeds: number;
  totalUnits?: number;
  sizeSqm?: number;
  basePrice: number;
  status?: RoomTypeStatus;
}

export type UpdateRoomTypePayload = Partial<CreateRoomTypePayload>;

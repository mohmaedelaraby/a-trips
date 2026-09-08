import type { Prisma } from '../../../generated/prisma/client';
import { toNullableNumber, toNumber } from '../../../common/utils/decimal.util';

export type RoomTypeRow = Prisma.RoomTypeGetPayload<object>;

/**
 * Wire shape for a room type.
 *
 * Prisma returns Decimal objects for money and size; those serialise as
 * `{s,e,d}` over JSON, so every response has to convert them. Doing it in one
 * mapper is what keeps a new endpoint from leaking the raw Decimal.
 */
export function toRoomTypeDto(roomType: RoomTypeRow) {
  return {
    id: roomType.id,
    hotelId: roomType.hotelId,
    name: roomType.name,
    description: roomType.description,
    capacityAdults: roomType.capacityAdults,
    capacityChildren: roomType.capacityChildren,
    numOfBeds: roomType.numOfBeds,
    totalUnits: roomType.totalUnits,
    sizeSqm: toNullableNumber(roomType.sizeSqm),
    basePrice: toNumber(roomType.basePrice),
    status: roomType.status,
    createdAt: roomType.createdAt,
    updatedAt: roomType.updatedAt,
  };
}

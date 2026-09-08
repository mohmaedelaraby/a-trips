import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { RoomTypesRepository } from './repositories/room-types.repository';
import { toRoomTypeDto } from './utils/room-type.util';
import type { CreateRoomTypeDto, UpdateRoomTypeDto } from './dto/room-type.dto';

@Injectable()
export class RoomTypesService {
  constructor(private readonly repository: RoomTypesRepository) {}

  async listForHotel(hotelId: string) {
    await this.assertHotelExists(hotelId);
    const rows = await this.repository.findByHotel(hotelId);
    return rows.map(toRoomTypeDto);
  }

  async findOne(id: string) {
    const roomType = await this.repository.findById(id);
    if (!roomType) throw new NotFoundException('Room type not found');
    return toRoomTypeDto(roomType);
  }

  async create(hotelId: string, dto: CreateRoomTypeDto) {
    await this.assertHotelExists(hotelId);
    const roomType = await this.repository.create({
      hotelId,
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      capacityAdults: dto.capacityAdults,
      capacityChildren: dto.capacityChildren ?? 0,
      numOfBeds: dto.numOfBeds,
      totalUnits: dto.totalUnits ?? 1,
      sizeSqm: dto.sizeSqm ?? null,
      basePrice: new Prisma.Decimal(dto.basePrice),
      ...(dto.status ? { status: dto.status } : {}),
    });
    return toRoomTypeDto(roomType);
  }

  /**
   * Changing basePrice only affects future quotes. Existing bookings keep the
   * price snapshotted on the booking row.
   */
  async update(id: string, dto: UpdateRoomTypeDto) {
    await this.findOne(id);
    const roomType = await this.repository.update(id, {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.description !== undefined ? { description: dto.description.trim() || null } : {}),
      ...(dto.capacityAdults !== undefined ? { capacityAdults: dto.capacityAdults } : {}),
      ...(dto.capacityChildren !== undefined ? { capacityChildren: dto.capacityChildren } : {}),
      ...(dto.numOfBeds !== undefined ? { numOfBeds: dto.numOfBeds } : {}),
      ...(dto.totalUnits !== undefined ? { totalUnits: dto.totalUnits } : {}),
      ...(dto.sizeSqm !== undefined ? { sizeSqm: dto.sizeSqm } : {}),
      ...(dto.basePrice !== undefined ? { basePrice: new Prisma.Decimal(dto.basePrice) } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
    });
    return toRoomTypeDto(roomType);
  }

  async remove(id: string) {
    await this.findOne(id);
    const activeBookings = await this.repository.countActiveBookings(id);
    if (activeBookings > 0) {
      // Deleting would orphan live bookings; deactivating is the safe equivalent.
      return this.update(id, { status: 'INACTIVE' });
    }
    await this.repository.delete(id);
    return { id, deleted: true };
  }

  private async assertHotelExists(hotelId: string) {
    const hotel = await this.repository.hotelExists(hotelId);
    if (!hotel) throw new NotFoundException('Hotel not found');
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { toNullableNumber, toNumber } from '../../common/utils/decimal.util';
import type { CreateRoomTypeDto, UpdateRoomTypeDto } from './dto/room-type.dto';

@Injectable()
export class RoomTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async listForHotel(hotelId: string) {
    await this.assertHotelExists(hotelId);
    const rows = await this.prisma.roomType.findMany({
      where: { hotelId },
      orderBy: { basePrice: 'asc' },
    });
    return rows.map((row) => this.toDto(row));
  }

  async findOne(id: string) {
    const roomType = await this.prisma.roomType.findUnique({ where: { id } });
    if (!roomType) throw new NotFoundException('Room type not found');
    return this.toDto(roomType);
  }

  async create(hotelId: string, dto: CreateRoomTypeDto) {
    await this.assertHotelExists(hotelId);
    const roomType = await this.prisma.roomType.create({
      data: {
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
      },
    });
    return this.toDto(roomType);
  }

  /**
   * Changing basePrice only affects future quotes. Existing bookings keep the
   * price snapshotted on the booking row.
   */
  async update(id: string, dto: UpdateRoomTypeDto) {
    await this.findOne(id);
    const roomType = await this.prisma.roomType.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description.trim() || null } : {}),
        ...(dto.capacityAdults !== undefined ? { capacityAdults: dto.capacityAdults } : {}),
        ...(dto.capacityChildren !== undefined ? { capacityChildren: dto.capacityChildren } : {}),
        ...(dto.numOfBeds !== undefined ? { numOfBeds: dto.numOfBeds } : {}),
        ...(dto.totalUnits !== undefined ? { totalUnits: dto.totalUnits } : {}),
        ...(dto.sizeSqm !== undefined ? { sizeSqm: dto.sizeSqm } : {}),
        ...(dto.basePrice !== undefined ? { basePrice: new Prisma.Decimal(dto.basePrice) } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
    });
    return this.toDto(roomType);
  }

  async remove(id: string) {
    await this.findOne(id);
    const activeBookings = await this.prisma.booking.count({
      where: { roomTypeId: id, status: { in: ['PENDING_CONFIRMATION', 'CONFIRMED'] } },
    });
    if (activeBookings > 0) {
      // Deleting would orphan live bookings; deactivating is the safe equivalent.
      return this.update(id, { status: 'INACTIVE' });
    }
    await this.prisma.roomType.delete({ where: { id } });
    return { id, deleted: true };
  }

  private toDto(roomType: Prisma.RoomTypeGetPayload<object>) {
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

  private async assertHotelExists(hotelId: string) {
    const hotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { id: true },
    });
    if (!hotel) throw new NotFoundException('Hotel not found');
  }
}

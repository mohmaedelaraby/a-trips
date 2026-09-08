import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type { Prisma } from '../../../generated/prisma/client';
import type { RoomTypeRow } from '../utils/room-type.util';

@Injectable()
export class RoomTypesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByHotel(hotelId: string): Promise<RoomTypeRow[]> {
    return this.prisma.roomType.findMany({ where: { hotelId }, orderBy: { basePrice: 'asc' } });
  }

  findById(id: string): Promise<RoomTypeRow | null> {
    return this.prisma.roomType.findUnique({ where: { id } });
  }

  hotelExists(hotelId: string) {
    return this.prisma.hotel.findUnique({ where: { id: hotelId }, select: { id: true } });
  }

  create(data: Prisma.RoomTypeUncheckedCreateInput): Promise<RoomTypeRow> {
    return this.prisma.roomType.create({ data });
  }

  update(id: string, data: Prisma.RoomTypeUpdateInput): Promise<RoomTypeRow> {
    return this.prisma.roomType.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.roomType.delete({ where: { id } });
  }

  /**
   * Bookings that still hold inventory on this room type.
   *
   * A live payment hold counts: the guest may be on the PayPal page right now,
   * and deleting the room out from under them would orphan the payment.
   */
  countActiveBookings(roomTypeId: string): Promise<number> {
    return this.prisma.booking.count({
      where: {
        roomTypeId,
        OR: [
          { status: { in: ['PENDING_CONFIRMATION', 'CONFIRMED'] } },
          { status: 'PENDING_PAYMENT', holdExpiresAt: { gt: new Date() } },
        ],
      },
    });
  }
}

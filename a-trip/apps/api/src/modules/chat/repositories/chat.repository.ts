import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { HotelStatus, RoomTypeStatus } from '../../../generated/prisma/enums';

/**
 * The inventory the assistant is allowed to talk about.
 *
 * Deliberately its own narrow query rather than the public search pipeline:
 * that one is availability-aware and paginated per request, which is far more
 * work than a grounding summary needs. This is one read, cached upstream.
 */
@Injectable()
export class ChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  findPublishedHotels(limit: number) {
    return this.prisma.hotel.findMany({
      where: { status: HotelStatus.PUBLISHED },
      orderBy: [{ city: 'asc' }, { name: 'asc' }],
      take: limit,
      select: {
        name: true,
        slug: true,
        city: true,
        country: true,
        stars: true,
        amenities: true,
        roomTypes: {
          where: { status: RoomTypeStatus.ACTIVE },
          select: { basePrice: true, capacityAdults: true },
        },
      },
    });
  }
}

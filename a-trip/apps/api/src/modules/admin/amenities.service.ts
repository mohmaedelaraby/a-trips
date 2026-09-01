import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { AmenityDto } from './dto/amenity.dto';

@Injectable()
export class AmenitiesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Each amenity is returned with how many hotels currently list it. */
  async list() {
    const [amenities, hotels] = await Promise.all([
      this.prisma.amenity.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] }),
      this.prisma.hotel.findMany({ select: { amenities: true } }),
    ]);

    const usage = new Map<string, number>();
    for (const hotel of hotels) {
      for (const name of hotel.amenities) {
        usage.set(name, (usage.get(name) ?? 0) + 1);
      }
    }

    return amenities.map((amenity) => ({
      id: amenity.id,
      name: amenity.name,
      category: amenity.category,
      hotelCount: usage.get(amenity.name) ?? 0,
    }));
  }

  async create(dto: AmenityDto) {
    const name = dto.name.trim();
    const existing = await this.prisma.amenity.findUnique({ where: { name } });
    if (existing) throw new BadRequestException('That amenity already exists');
    return this.prisma.amenity.create({
      data: { name, category: dto.category?.trim() || null },
    });
  }

  async update(id: string, dto: AmenityDto) {
    await this.assertExists(id);
    return this.prisma.amenity.update({
      where: { id },
      data: { name: dto.name.trim(), category: dto.category?.trim() || null },
    });
  }

  async remove(id: string) {
    await this.assertExists(id);
    await this.prisma.amenity.delete({ where: { id } });
    return { id, deleted: true };
  }

  private async assertExists(id: string) {
    const amenity = await this.prisma.amenity.findUnique({ where: { id }, select: { id: true } });
    if (!amenity) throw new NotFoundException('Amenity not found');
  }
}

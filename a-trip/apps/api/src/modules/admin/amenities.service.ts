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

  /**
   * Renaming an amenity rewrites it on every hotel that lists it.
   *
   * Hotel.amenities is a String[] of names, not a relation, so the catalogue row
   * and the hotels that use it are only joined by the string itself. Updating
   * the catalogue alone would leave hotels holding the old name: the amenity
   * would silently stop matching the search filter, and its usage count here
   * would drop to zero, with nothing appearing to fail.
   *
   * Both writes go in one transaction so a rename can never land half-applied.
   */
  async update(id: string, dto: AmenityDto) {
    const current = await this.assertExists(id);
    const name = dto.name.trim();

    if (name !== current.name) {
      const clash = await this.prisma.amenity.findUnique({ where: { name } });
      if (clash) throw new BadRequestException('Another amenity already has that name');
    }

    const [amenity] = await this.prisma.$transaction([
      this.prisma.amenity.update({
        where: { id },
        data: { name, category: dto.category?.trim() || null },
      }),
      ...(name !== current.name
        ? [
            this.prisma.$executeRaw`
              UPDATE "Hotel"
              SET "amenities" = array_replace("amenities", ${current.name}, ${name})
              WHERE ${current.name} = ANY("amenities")
            `,
          ]
        : []),
    ]);

    return amenity;
  }

  /** Deleting drops the amenity from every hotel that lists it, for the same reason. */
  async remove(id: string) {
    const current = await this.assertExists(id);

    await this.prisma.$transaction([
      this.prisma.$executeRaw`
        UPDATE "Hotel"
        SET "amenities" = array_remove("amenities", ${current.name})
        WHERE ${current.name} = ANY("amenities")
      `,
      this.prisma.amenity.delete({ where: { id } }),
    ]);

    return { id, deleted: true };
  }

  private async assertExists(id: string) {
    const amenity = await this.prisma.amenity.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
    if (!amenity) throw new NotFoundException('Amenity not found');
    return amenity;
  }
}

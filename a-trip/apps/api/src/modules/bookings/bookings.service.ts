import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { BookingStatus, RoomTypeStatus } from '../../generated/prisma/enums';
import { AvailabilityService } from '../availability/availability.service';
import { generateBookingReference } from '../../common/utils/booking-reference.util';
import { buildMeta, resolvePagination } from '../../common/utils/pagination.util';
import { toNumber } from '../../common/utils/decimal.util';
import { countNights, parseDateOnly, startOfTodayUtc } from '../../common/utils/date.util';
import type { AdminBookingQueryDto, BookingDecisionDto, CreateBookingDto } from './dto/booking.dto';

const bookingInclude = {
  hotel: { include: { images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 } } },
  roomType: true,
  user: { select: { id: true, name: true, email: true, phone: true } },
} satisfies Prisma.BookingInclude;

type BookingRow = Prisma.BookingGetPayload<{ include: typeof bookingInclude }>;

/** Postgres serialization / deadlock codes worth one retry. */
const RETRYABLE_PG_CODES = new Set(['40001', '40P01']);
const MAX_ATTEMPTS = 3;

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: AvailabilityService,
  ) {}

  /**
   * Creates a booking request.
   *
   * The availability check and the insert run inside one interactive
   * transaction that first takes FOR UPDATE row locks on every night of the
   * stay, so two concurrent requests for the last unit serialise and exactly
   * one succeeds - the other sees the first booking and is rejected.
   *
   * There is no payment step yet: the booking lands as PENDING_CONFIRMATION and
   * already holds inventory. When a gateway is added it slots in between this
   * call and admin confirmation (add a Payment row keyed by bookingId and a
   * PENDING_PAYMENT status ahead of PENDING_CONFIRMATION) with no change to the
   * availability model.
   */
  async create(userId: string, dto: CreateBookingDto) {
    const checkIn = parseDateOnly(dto.checkInDate);
    const checkOut = parseDateOnly(dto.checkOutDate);
    const nights = countNights(checkIn, checkOut);

    if (nights < 1) {
      throw new BadRequestException('Check-out must be at least one night after check-in');
    }
    if (checkIn < startOfTodayUtc()) {
      throw new BadRequestException('Check-in cannot be in the past');
    }

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        return await this.createOnce(userId, dto, checkIn, checkOut);
      } catch (error) {
        if (attempt < MAX_ATTEMPTS && this.isRetryable(error)) {
          this.logger.warn(`Retrying booking create (attempt ${attempt + 1})`);
          continue;
        }
        throw error;
      }
    }
    throw new ConflictException('Could not complete the booking, please try again');
  }

  private async createOnce(
    userId: string,
    dto: CreateBookingDto,
    checkIn: Date,
    checkOut: Date,
  ): Promise<ReturnType<BookingsService['toDto']>> {
    const booking = await this.prisma.$transaction(
      async (tx) => {
        const roomType = await tx.roomType.findUnique({
          where: { id: dto.roomTypeId },
          include: { hotel: { select: { id: true, status: true } } },
        });
        if (!roomType) throw new NotFoundException('Room type not found');
        if (roomType.status === RoomTypeStatus.INACTIVE) {
          throw new ConflictException('This room type is not currently on sale');
        }
        if (roomType.hotel.status !== 'PUBLISHED') {
          throw new ConflictException('This hotel is not currently bookable');
        }

        const numChildren = dto.numChildren ?? 0;
        if (dto.numAdults > roomType.capacityAdults) {
          throw new BadRequestException(
            `This room takes at most ${roomType.capacityAdults} adult(s)`,
          );
        }
        if (numChildren > roomType.capacityChildren) {
          throw new BadRequestException(
            `This room takes at most ${roomType.capacityChildren} child(ren)`,
          );
        }

        // Lock first, then read: any competing transaction blocks here until we commit.
        await this.availability.lockNightsForUpdate(tx, dto.roomTypeId, checkIn, checkOut);

        const assessment = await this.availability.assessRange(
          tx,
          dto.roomTypeId,
          dto.checkInDate,
          dto.checkOutDate,
        );
        if (!assessment.bookable || assessment.totalPrice === null) {
          throw new ConflictException(this.unavailableMessage(assessment.reason));
        }

        return tx.booking.create({
          data: {
            bookingReference: generateBookingReference(),
            userId,
            hotelId: roomType.hotelId,
            roomTypeId: roomType.id,
            checkInDate: checkIn,
            checkOutDate: checkOut,
            numAdults: dto.numAdults,
            numChildren,
            // Price is snapshotted here and never recalculated from live rates.
            totalPrice: new Prisma.Decimal(assessment.totalPrice),
            status: BookingStatus.PENDING_CONFIRMATION,
            specialRequests: dto.specialRequests?.trim() || null,
          },
          include: bookingInclude,
        });
      },
      { timeout: 15_000, maxWait: 10_000 },
    );

    return this.toDto(booking, true);
  }

  // ------------------------------------------------------------------ user

  async listMine(userId: string, page?: number, pageSize?: number) {
    const pagination = resolvePagination({ page, pageSize });
    const [rows, total] = await Promise.all([
      this.prisma.booking.findMany({
        where: { userId },
        include: bookingInclude,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.booking.count({ where: { userId } }),
    ]);
    return {
      items: rows.map((row) => this.toDto(row, true)),
      meta: buildMeta(pagination.page, pagination.pageSize, total),
    };
  }

  /**
   * Reference lookup. Anonymous callers get the booking without guest details;
   * the owner and admins get the full record.
   */
  async findByReference(reference: string, viewer?: { id: string; role: string }) {
    const booking = await this.prisma.booking.findUnique({
      where: { bookingReference: reference.trim().toUpperCase() },
      include: bookingInclude,
    });
    if (!booking) throw new NotFoundException('Booking not found');
    const privileged = Boolean(viewer && (viewer.role === 'ADMIN' || viewer.id === booking.userId));
    return this.toDto(booking, privileged);
  }

  async cancelOwn(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: bookingInclude,
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.userId !== userId) throw new ForbiddenException('This is not your booking');
    if (
      booking.status !== BookingStatus.PENDING_CONFIRMATION &&
      booking.status !== BookingStatus.CONFIRMED
    ) {
      throw new ConflictException('This booking can no longer be cancelled');
    }

    // Cancelling frees the room implicitly - availability only counts
    // PENDING_CONFIRMATION and CONFIRMED bookings.
    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CANCELLED },
      include: bookingInclude,
    });
    return this.toDto(updated, true);
  }

  // ----------------------------------------------------------------- admin

  async adminList(query: AdminBookingQueryDto) {
    const { page, pageSize, skip, take } = resolvePagination(query);
    const where: Prisma.BookingWhereInput = {};

    if (query.status) where.status = query.status;
    if (query.hotelId) where.hotelId = query.hotelId;
    if (query.reference) {
      where.bookingReference = { contains: query.reference.trim(), mode: 'insensitive' };
    }
    if (query.guest) {
      where.user = {
        OR: [
          { name: { contains: query.guest, mode: 'insensitive' } },
          { email: { contains: query.guest, mode: 'insensitive' } },
        ],
      };
    }
    if (query.submittedWithinDays) {
      where.createdAt = { gte: new Date(Date.now() - query.submittedWithinDays * 86_400_000) };
    }
    if (query.checkInFrom || query.checkInTo) {
      where.checkInDate = {
        ...(query.checkInFrom ? { gte: parseDateOnly(query.checkInFrom) } : {}),
        ...(query.checkInTo ? { lte: parseDateOnly(query.checkInTo) } : {}),
      };
    }

    const [rows, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: bookingInclude,
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        skip,
        take,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      items: rows.map((row) => this.toDto(row, true)),
      meta: buildMeta(page, pageSize, total),
    };
  }

  confirm(id: string, dto: BookingDecisionDto) {
    return this.decide(id, BookingStatus.CONFIRMED, dto);
  }

  /**
   * Rejecting frees inventory with no explicit release: the availability
   * calculation simply stops counting this booking.
   */
  reject(id: string, dto: BookingDecisionDto) {
    return this.decide(id, BookingStatus.REJECTED, dto);
  }

  /** Internal note, editable at any status and never shown to the guest. */
  async setAdminNote(id: string, adminNote: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');
    const updated = await this.prisma.booking.update({
      where: { id },
      data: { adminNote: adminNote.trim() || null },
      include: bookingInclude,
    });
    return this.toDto(updated, true);
  }

  private async decide(id: string, next: BookingStatus, dto: BookingDecisionDto) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status !== BookingStatus.PENDING_CONFIRMATION) {
      throw new ConflictException(
        `Only bookings awaiting confirmation can be updated (this one is ${booking.status})`,
      );
    }

    const updated = await this.prisma.booking.update({
      where: { id },
      data: { status: next, adminNote: dto.adminNote?.trim() || booking.adminNote },
      include: bookingInclude,
    });
    return this.toDto(updated, true);
  }

  // --------------------------------------------------------------- helpers

  private unavailableMessage(reason?: string) {
    switch (reason) {
      case 'STOP_SELL':
        return 'These dates are closed for sale';
      case 'NO_INVENTORY':
        return 'This room is not on sale for the selected dates';
      case 'INACTIVE':
        return 'This room type is not currently on sale';
      default:
        return 'This room was just booked and is no longer available for those dates';
    }
  }

  private isRetryable(error: unknown): boolean {
    const code = (error as { code?: string } | null)?.code;
    return typeof code === 'string' && RETRYABLE_PG_CODES.has(code);
  }

  private toDto(booking: BookingRow, includeGuest: boolean) {
    const primaryImage = booking.hotel.images[0];
    return {
      id: booking.id,
      bookingReference: booking.bookingReference,
      hotelId: booking.hotelId,
      roomTypeId: booking.roomTypeId,
      roomTypeName: booking.roomType.name,
      checkInDate: booking.checkInDate.toISOString().slice(0, 10),
      checkOutDate: booking.checkOutDate.toISOString().slice(0, 10),
      nights: countNights(booking.checkInDate, booking.checkOutDate),
      numAdults: booking.numAdults,
      numChildren: booking.numChildren,
      totalPrice: toNumber(booking.totalPrice),
      status: booking.status,
      adminNote: booking.adminNote,
      specialRequests: booking.specialRequests,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
      hotel: {
        id: booking.hotel.id,
        slug: booking.hotel.slug,
        name: booking.hotel.name,
        city: booking.hotel.city,
        country: booking.hotel.country,
        address: booking.hotel.address,
        stars: booking.hotel.stars,
        imageUrl: primaryImage ? primaryImage.url : null,
      },
      ...(includeGuest ? { guest: booking.user } : {}),
    };
  }
}

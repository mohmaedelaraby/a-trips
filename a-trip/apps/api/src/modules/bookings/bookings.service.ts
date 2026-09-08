import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { BookingStatus, RoomTypeStatus } from '../../generated/prisma/enums';
import { AvailabilityService, HOLD_MINUTES } from '../availability/availability.service';
import { generateBookingReference } from '../../common/utils/booking-reference.util';
import { buildMeta, resolvePagination } from '../../common/utils/pagination.util';
import { countNights, parseDateOnly, startOfTodayUtc } from '../../common/utils/date.util';
import { BookingsRepository } from './repositories/bookings.repository';
import {
  MAX_ATTEMPTS,
  buildAdminBookingWhere,
  isRetryable,
  toBookingDto,
  unavailableMessage,
} from './utils/booking.util';
import type { AdminBookingQueryDto, BookingDecisionDto, CreateBookingDto } from './dto/booking.dto';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly repository: BookingsRepository,
    private readonly availability: AvailabilityService,
  ) {}

  /**
   * Opens a booking and holds the rooms while the guest pays.
   *
   * The availability check and the insert run inside one interactive
   * transaction that first takes FOR UPDATE row locks on every night of the
   * stay, so two concurrent requests for the last unit serialise and exactly
   * one succeeds - the other sees the first hold and is rejected.
   *
   * The booking lands as PENDING_PAYMENT with a holdExpiresAt HOLD_MINUTES in
   * the future. That hold consumes inventory for as long as it is live, which
   * is what stops a second guest paying for the same last room. Abandon the
   * checkout and the room frees itself the moment the hold lapses - see
   * CONSUMES_INVENTORY. Payment capture then moves it to PENDING_CONFIRMATION
   * for staff to approve.
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
        if (attempt < MAX_ATTEMPTS && isRetryable(error)) {
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
  ) {
    const booking = await this.repository.transaction(async (tx) => {
      const roomType = await this.repository.findRoomTypeForBooking(tx, dto.roomTypeId);
      if (!roomType) throw new NotFoundException('Room type not found');
      if (roomType.status === RoomTypeStatus.INACTIVE) {
        throw new ConflictException('This room type is not currently on sale');
      }
      if (roomType.hotel.status !== 'PUBLISHED') {
        throw new ConflictException('This hotel is not currently bookable');
      }

      const numChildren = dto.numChildren ?? 0;
      if (dto.numAdults > roomType.capacityAdults) {
        throw new BadRequestException(`This room takes at most ${roomType.capacityAdults} adult(s)`);
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
        throw new ConflictException(unavailableMessage(assessment.reason));
      }

      return this.repository.create(tx, {
        bookingReference: generateBookingReference(),
        userId,
        hotelId: roomType.hotelId,
        roomTypeId: roomType.id,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        numAdults: dto.numAdults,
        numChildren,
        // Price is snapshotted here and never recalculated from live rates,
        // so the amount charged is exactly the amount quoted.
        totalPrice: new Prisma.Decimal(assessment.totalPrice),
        status: BookingStatus.PENDING_PAYMENT,
        holdExpiresAt: new Date(Date.now() + HOLD_MINUTES * 60_000),
        specialRequests: dto.specialRequests?.trim() || null,
      });
    });

    return toBookingDto(booking, true);
  }

  // ------------------------------------------------------------------ user

  async listMine(userId: string, page?: number, pageSize?: number) {
    const pagination = resolvePagination({ page, pageSize });
    const [rows, total] = await this.repository.findPage(
      { userId },
      [{ createdAt: 'desc' }],
      pagination.skip,
      pagination.take,
    );
    return {
      items: rows.map((row) => toBookingDto(row, true)),
      meta: buildMeta(pagination.page, pagination.pageSize, total),
    };
  }

  /**
   * Reference lookup. Anonymous callers get the booking without guest details;
   * the owner and admins get the full record.
   */
  async findByReference(reference: string, viewer?: { id: string; role: string }) {
    const booking = await this.repository.findByReference(reference.trim().toUpperCase());
    if (!booking) throw new NotFoundException('Booking not found');
    const privileged = Boolean(viewer && (viewer.role === 'ADMIN' || viewer.id === booking.userId));
    return toBookingDto(booking, privileged);
  }

  async cancelOwn(userId: string, bookingId: string) {
    const booking = await this.repository.findByIdWithRelations(bookingId);
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.userId !== userId) throw new ForbiddenException('This is not your booking');
    // PENDING_PAYMENT is included so abandoning checkout releases the hold at
    // once rather than sitting on the rooms for the rest of the 15 minutes.
    if (
      booking.status !== BookingStatus.PENDING_PAYMENT &&
      booking.status !== BookingStatus.PENDING_CONFIRMATION &&
      booking.status !== BookingStatus.CONFIRMED
    ) {
      throw new ConflictException('This booking can no longer be cancelled');
    }

    // Cancelling frees the room implicitly - see CONSUMES_INVENTORY.
    const updated = await this.repository.update(bookingId, {
      status: BookingStatus.CANCELLED,
    });
    return toBookingDto(updated, true);
  }

  // ----------------------------------------------------------------- admin

  async adminList(query: AdminBookingQueryDto) {
    const { page, pageSize, skip, take } = resolvePagination(query);
    const where = buildAdminBookingWhere(query);

    const [rows, total] = await this.repository.findPage(
      where,
      [{ status: 'asc' }, { createdAt: 'desc' }],
      skip,
      take,
    );

    return {
      items: rows.map((row) => toBookingDto(row, true)),
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
    const booking = await this.repository.findById(id);
    if (!booking) throw new NotFoundException('Booking not found');
    const updated = await this.repository.update(id, {
      adminNote: adminNote.trim() || null,
    });
    return toBookingDto(updated, true);
  }

  private async decide(id: string, next: BookingStatus, dto: BookingDecisionDto) {
    const booking = await this.repository.findById(id);
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status !== BookingStatus.PENDING_CONFIRMATION) {
      throw new ConflictException(
        `Only bookings awaiting confirmation can be updated (this one is ${booking.status})`,
      );
    }

    const updated = await this.repository.update(id, {
      status: next,
      adminNote: dto.adminNote?.trim() || booking.adminNote,
    });
    return toBookingDto(updated, true);
  }
}

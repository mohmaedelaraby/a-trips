import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';
import { BookingStatus } from '../../../generated/prisma/enums';

export class CreateBookingDto {
  @IsUUID()
  roomTypeId: string;

  @IsISO8601({ strict: true })
  checkInDate: string;

  @IsISO8601({ strict: true })
  checkOutDate: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  numAdults: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20)
  numChildren?: number;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  specialRequests?: string;
}

export class BookingDecisionDto {
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  adminNote?: string;
}

export class AdminBookingQueryDto {
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @IsOptional()
  @IsUUID()
  hotelId?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  /** Free-text match on guest name or email. */
  @IsOptional()
  @IsString()
  guest?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  checkInFrom?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  checkInTo?: string;

  /** Only bookings submitted within the last N days. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  submittedWithinDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

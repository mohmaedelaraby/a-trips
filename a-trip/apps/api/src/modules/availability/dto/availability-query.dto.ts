import { IsISO8601 } from 'class-validator';

export class AvailabilityRangeQueryDto {
  @IsISO8601({ strict: true })
  checkIn: string;

  @IsISO8601({ strict: true })
  checkOut: string;
}

export class CalendarQueryDto {
  @IsISO8601({ strict: true })
  from: string;

  @IsISO8601({ strict: true })
  to: string;
}

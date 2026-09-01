import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export class BulkAvailabilityDto {
  @IsISO8601({ strict: true })
  from: string;

  @IsISO8601({ strict: true })
  to: string;

  /** 0 = Sunday .. 6 = Saturday. Omitted or empty means every day in the range. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  @Type(() => Number)
  daysOfWeek?: number[];

  @IsInt()
  @Min(0)
  @Max(1000)
  @Type(() => Number)
  totalUnits: number;

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  priceOverride?: number | null;

  @IsOptional()
  @IsBoolean()
  stopSell?: boolean;
}

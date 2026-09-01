import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

const HOTEL_SORTS = ['recommended', 'price_asc', 'price_desc', 'stars_desc', 'name_asc'] as const;
export type HotelSortKey = (typeof HOTEL_SORTS)[number];

/** Accepts ?stars=4&stars=5 as well as ?stars=4,5 */
const toArray = ({ value }: { value: unknown }): unknown[] => {
  if (value === undefined || value === null || value === '') return [];
  if (Array.isArray(value)) return value.flatMap((v) => String(v).split(','));
  return String(value).split(',');
};

export class HotelSearchDto {
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  checkIn?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  checkOut?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  adults?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20)
  children?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(5, { each: true })
  stars?: number[];

  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @IsOptional()
  @IsIn(HOTEL_SORTS)
  sort?: HotelSortKey;

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

export class HotelDetailQueryDto {
  @IsOptional()
  @IsISO8601({ strict: true })
  checkIn?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  checkOut?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  adults?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20)
  children?: number;
}

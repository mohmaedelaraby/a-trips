import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { HotelStatus } from '../../../generated/prisma/enums';

export class HotelImageDto {
  @IsUrl({ require_tld: false })
  url: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class CreateHotelDto {
  @IsString()
  @Length(2, 160)
  name: string;

  @IsString()
  @Length(2, 80)
  city: string;

  @IsString()
  @Length(2, 240)
  address: string;

  @IsString()
  @Length(2, 80)
  country: string;

  @IsOptional()
  @IsString()
  @Length(0, 5000)
  description?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  stars: number;

  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  longitude?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(60)
  @IsString({ each: true })
  amenities?: string[];

  @IsOptional()
  @IsEnum(HotelStatus)
  status?: HotelStatus;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => HotelImageDto)
  images?: HotelImageDto[];
}

export class UpdateHotelDto {
  @IsOptional()
  @IsString()
  @Length(2, 160)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(2, 80)
  city?: string;

  @IsOptional()
  @IsString()
  @Length(2, 240)
  address?: string;

  @IsOptional()
  @IsString()
  @Length(2, 80)
  country?: string;

  @IsOptional()
  @IsString()
  @Length(0, 5000)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  stars?: number;

  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  longitude?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(60)
  @IsString({ each: true })
  amenities?: string[];

  @IsOptional()
  @IsEnum(HotelStatus)
  status?: HotelStatus;
}

export class AddHotelImagesDto {
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => HotelImageDto)
  images: HotelImageDto[];
}

export class ReorderHotelImagesDto {
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  imageIds: string[];
}

export class AdminHotelListDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsEnum(HotelStatus)
  status?: HotelStatus;

  @IsOptional()
  @IsString()
  city?: string;

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

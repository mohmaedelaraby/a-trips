import { IsObject, IsOptional, IsString, Length } from 'class-validator';

export class AmenityDto {
  /** Per-locale display text, e.g. { AR: 'واي فاي مجاني' }. */
  @IsOptional()
  @IsObject()
  translations?: Record<string, string>;

  @IsString()
  @Length(2, 80)
  name: string;

  @IsOptional()
  @IsString()
  @Length(0, 60)
  category?: string;
}

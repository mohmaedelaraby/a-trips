import { IsOptional, IsString, Length } from 'class-validator';

export class AmenityDto {
  @IsString()
  @Length(2, 80)
  name: string;

  @IsOptional()
  @IsString()
  @Length(0, 60)
  category?: string;
}

import { IsISO8601, IsOptional, IsString, Length, ValidateIf } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Length(2, 120)
  name?: string;

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  @Length(5, 30)
  phone?: string | null;

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsISO8601()
  dateOfBirth?: string | null;
}

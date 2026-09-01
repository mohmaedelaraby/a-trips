import { IsEmail, IsISO8601, IsOptional, IsString, Length, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @Length(2, 120)
  name: string;

  @IsEmail({}, { message: 'Enter a valid email address' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;

  @IsOptional()
  @IsString()
  @Length(5, 30)
  phone?: string;

  @IsOptional()
  @IsISO8601()
  dateOfBirth?: string;
}

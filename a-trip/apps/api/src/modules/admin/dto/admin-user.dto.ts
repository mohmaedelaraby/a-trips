import { IsEmail, IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { AdminRole, UserStatus } from '../../../generated/prisma/enums';

export class InviteAdminUserDto {
  @IsString()
  @Length(2, 120)
  name: string;

  @IsEmail()
  email: string;

  @IsEnum(AdminRole)
  adminRole: AdminRole;
}

export class UpdateAdminUserDto {
  @IsOptional()
  @IsString()
  @Length(2, 120)
  name?: string;

  @IsOptional()
  @IsEnum(AdminRole)
  adminRole?: AdminRole;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}

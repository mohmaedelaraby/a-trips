import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService, type PublicUserDto } from '../users/users.service';
import { UserStatus } from '../../generated/prisma/enums';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { User } from '../../generated/prisma/client';

export interface AuthSessionDto {
  accessToken: string;
  user: PublicUserDto;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthSessionDto> {
    const user = await this.users.create(dto);
    return this.buildSession(user);
  }

  async login(dto: LoginDto): Promise<AuthSessionDto> {
    const user = await this.users.findByEmail(dto.email);
    // Compare against a dummy hash shape only if user exists; message stays generic either way.
    if (!user || !(await this.users.verifyPassword(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Incorrect email or password');
    }
    if (user.status === UserStatus.BANNED || user.status === UserStatus.DISABLED) {
      throw new UnauthorizedException('This account has been suspended');
    }
    if (user.status === UserStatus.INVITED) {
      throw new UnauthorizedException('Accept your invite before signing in');
    }
    return this.buildSession(user);
  }

  private buildSession(user: User): AuthSessionDto {
    const accessToken = this.jwt.sign({ sub: user.id, email: user.email, role: user.role });
    return { accessToken, user: UsersService.toPublic(user) };
  }
}

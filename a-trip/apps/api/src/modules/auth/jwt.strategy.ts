import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';
import { UserStatus } from '../../generated/prisma/enums';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly users: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.users.findById(payload.sub);
    if (!user) throw new UnauthorizedException('Session is no longer valid');
    // INVITED accounts have no usable password, so only BANNED/DISABLED
    // can reach here with a live token — revoke it either way.
    if (user.status === UserStatus.BANNED || user.status === UserStatus.DISABLED) {
      throw new UnauthorizedException('This account has been suspended');
    }
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Socket } from 'socket.io';
import { UsersService } from '../users/users.service';
import { Role, UserStatus } from '../../generated/prisma/enums';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import type { JwtPayload } from '../auth/jwt.strategy';
import { readSessionCookieFromHeader } from '../auth/session-cookie';

export type LiveChatScope = 'user' | 'admin';

/**
 * Authenticates a socket once, at handshake time.
 *
 * The HTTP guards cannot do this: they run per request, and a socket is one
 * long-lived connection that never passes through Express. So the same rules
 * are applied here by hand — the scoped session cookie (or a bearer token for
 * non-browser clients), the same suspended-account check as JwtStrategy, and
 * the admin role for the staff gateway.
 */
@Injectable()
export class LiveChatAuth {
  private readonly logger = new Logger(LiveChatAuth.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly users: UsersService,
    private readonly config: ConfigService,
  ) {}

  async authenticate(client: Socket, scope: LiveChatScope): Promise<AuthenticatedUser | null> {
    // Cookie auth on a WebSocket is open to cross-site hijacking: any page a
    // signed-in guest visits could open a socket that carries their cookie.
    // Browsers always send Origin on the handshake, so an origin we did not
    // configure is refused. A missing Origin is a non-browser client, which
    // has no victim's cookie to borrow.
    const origin = client.handshake.headers.origin;
    if (origin && !this.allowedOrigins().includes(origin)) {
      this.logger.warn(`Live chat refused origin ${origin}`);
      return null;
    }

    const bearer = typeof client.handshake.auth?.token === 'string' ? client.handshake.auth.token : null;
    const token = bearer ?? readSessionCookieFromHeader(client.handshake.headers.cookie, scope);
    if (!token) return null;

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      return null;
    }

    const user = await this.users.findById(payload.sub);
    if (!user) return null;
    if (user.status === UserStatus.BANNED || user.status === UserStatus.DISABLED) return null;
    if (scope === 'admin' && user.role !== Role.ADMIN) return null;

    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }

  private allowedOrigins(): string[] {
    return (this.config.get<string>('CORS_ORIGIN') ?? 'http://localhost:3000')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  }
}

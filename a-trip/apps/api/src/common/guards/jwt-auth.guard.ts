import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Applied globally. On @Public() routes it still tries to resolve the bearer
 * token, so handlers can tailor the response for a signed-in caller, but a
 * missing or invalid token is not an error there.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  /**
   * HTTP only. Nest applies APP_GUARD to WebSocket gateways too, where there is
   * no request for passport to read and every event would be rejected. The
   * live-chat gateways authenticate once, at connection time, from the same
   * session cookie — see live-chat/live-chat-auth.ts.
   */
  canActivate(context: ExecutionContext) {
    if (context.getType() !== 'http') return true;
    return super.canActivate(context);
  }

  handleRequest<TUser>(err: unknown, user: TUser, _info: unknown, context: ExecutionContext) {
    if (this.isPublic(context)) {
      return (user || undefined) as TUser;
    }
    if (err || !user) {
      throw err instanceof Error ? err : new UnauthorizedException('Authentication required');
    }
    return user;
  }

  private isPublic(context: ExecutionContext): boolean {
    return (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? false
    );
  }
}

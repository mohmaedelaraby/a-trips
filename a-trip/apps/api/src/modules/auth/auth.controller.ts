import { Body, Controller, Get, HttpCode, HttpStatus, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from '../users/users.service';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { Role } from '../../generated/prisma/enums';
import type { AuthSessionDto } from './auth.service';
import { ADMIN_COOKIE_OPTIONS, SESSION_COOKIE, USER_COOKIE_OPTIONS } from './session-cookie';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
  ) {}

  /**
   * Sets the httpOnly session cookie matching who just signed in — admin role
   * gets the admin-scoped cookie, everyone else gets the guest one, never
   * both. This is what lets an admin tab and a guest tab of the same account
   * (or two different accounts) stay signed in independently: see
   * session-cookie.ts for the mechanism this depends on.
   */
  private issueCookie(res: Response, session: AuthSessionDto): void {
    if (session.user.role === Role.ADMIN) {
      res.cookie(SESSION_COOKIE.ADMIN, session.accessToken, ADMIN_COOKIE_OPTIONS);
    } else {
      res.cookie(SESSION_COOKIE.USER, session.accessToken, USER_COOKIE_OPTIONS);
    }
  }

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const session = await this.auth.register(dto);
    this.issueCookie(res, session);
    return session;
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const session = await this.auth.login(dto);
    this.issueCookie(res, session);
    return session;
  }

  /** Clears the guest session cookie only — the admin cookie, if any, is untouched. */
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(SESSION_COOKIE.USER, USER_COOKIE_OPTIONS);
    return { loggedOut: true };
  }

  /** Clears the admin session cookie only — a guest tab stays signed in. */
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('admin-logout')
  adminLogout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(SESSION_COOKIE.ADMIN, ADMIN_COOKIE_OPTIONS);
    return { loggedOut: true };
  }

  @ApiBearerAuth()
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.users.getProfile(user.id);
  }
}

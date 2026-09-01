import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { AdminRole, Role, UserStatus } from '../../generated/prisma/enums';
import type { InviteAdminUserDto, UpdateAdminUserDto } from './dto/admin-user.dto';

const STAFF_SELECT = {
  id: true,
  name: true,
  email: true,
  adminRole: true,
  status: true,
  invitedAt: true,
  lastActiveAt: true,
  createdAt: true,
} as const;

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {}

  list() {
    return this.prisma.user.findMany({
      where: { role: Role.ADMIN },
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
      select: STAFF_SELECT,
    });
  }

  /**
   * Creates the staff account in an INVITED state with an unusable random
   * password — the invitee sets a real one when they accept.
   */
  async invite(dto: InviteAdminUserDto) {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new BadRequestException('That email already has an account');

    return this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email,
        // Hashed through UsersService so the invite placeholder uses the same
        // bcrypt cost factor as every other password in the system.
        passwordHash: await this.users.hashPassword(randomBytes(24).toString('hex')),
        role: Role.ADMIN,
        adminRole: dto.adminRole,
        status: UserStatus.INVITED,
        invitedAt: new Date(),
      },
      select: STAFF_SELECT,
    });
  }

  async update(id: string, dto: UpdateAdminUserDto) {
    const user = await this.prisma.user.findFirst({ where: { id, role: Role.ADMIN } });
    if (!user) throw new NotFoundException('Admin user not found');

    return this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.adminRole !== undefined ? { adminRole: dto.adminRole as AdminRole } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
      select: STAFF_SELECT,
    });
  }

  /** Re-stamps the invite date so the "expires in 7 days" clock restarts. */
  async resendInvite(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, role: Role.ADMIN, status: UserStatus.INVITED },
    });
    if (!user) throw new NotFoundException('No pending invite for this user');

    return this.prisma.user.update({
      where: { id },
      data: { invitedAt: new Date() },
      select: STAFF_SELECT,
    });
  }
}

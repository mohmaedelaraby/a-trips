import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AdminRole, Role, UserStatus } from '../../generated/prisma/enums';
import { hashPassword } from '../users/utils/password.util';
import { normalizeEmail } from '../users/utils/user.util';
import { AdminUsersRepository } from './repositories/admin-users.repository';
import { invitePlaceholderPassword } from './utils/admin-user.util';
import type { InviteAdminUserDto, UpdateAdminUserDto } from './dto/admin-user.dto';

@Injectable()
export class AdminUsersService {
  constructor(private readonly repository: AdminUsersRepository) {}

  list() {
    return this.repository.list();
  }

  /**
   * Creates the staff account in an INVITED state with an unusable random
   * password — the invitee sets a real one when they accept.
   */
  async invite(dto: InviteAdminUserDto) {
    const email = normalizeEmail(dto.email);
    const existing = await this.repository.findByEmail(email);
    if (existing) throw new BadRequestException('That email already has an account');

    return this.repository.create({
      name: dto.name.trim(),
      email,
      // Hashed with the shared helper so the invite placeholder uses the same
      // bcrypt cost factor as every other password in the system.
      passwordHash: await hashPassword(invitePlaceholderPassword()),
      role: Role.ADMIN,
      adminRole: dto.adminRole,
      status: UserStatus.INVITED,
      invitedAt: new Date(),
    });
  }

  async update(id: string, dto: UpdateAdminUserDto) {
    const user = await this.repository.findAdminById(id);
    if (!user) throw new NotFoundException('Admin user not found');

    return this.repository.update(id, {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.adminRole !== undefined ? { adminRole: dto.adminRole as AdminRole } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
    });
  }

  /** Re-stamps the invite date so the "expires in 7 days" clock restarts. */
  async resendInvite(id: string) {
    const user = await this.repository.findPendingInvite(id);
    if (!user) throw new NotFoundException('No pending invite for this user');

    return this.repository.update(id, { invitedAt: new Date() });
  }
}

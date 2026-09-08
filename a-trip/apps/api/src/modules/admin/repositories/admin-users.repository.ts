import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '../../../generated/prisma/client';
import { Role, UserStatus } from '../../../generated/prisma/enums';

/**
 * Columns returned for a staff row.
 *
 * Explicit rather than `include`-everything so the password hash cannot reach
 * an admin response by accident — the staff list has no use for it.
 */
export const STAFF_SELECT = {
  id: true,
  name: true,
  email: true,
  adminRole: true,
  status: true,
  invitedAt: true,
  lastActiveAt: true,
  createdAt: true,
} as const;

export type StaffRow = Prisma.UserGetPayload<{ select: typeof STAFF_SELECT }>;

@Injectable()
export class AdminUsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(): Promise<StaffRow[]> {
    return this.prisma.user.findMany({
      where: { role: Role.ADMIN },
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
      select: STAFF_SELECT,
    });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email }, select: { id: true } });
  }

  findAdminById(id: string) {
    return this.prisma.user.findFirst({ where: { id, role: Role.ADMIN }, select: { id: true } });
  }

  findPendingInvite(id: string) {
    return this.prisma.user.findFirst({
      where: { id, role: Role.ADMIN, status: UserStatus.INVITED },
      select: { id: true },
    });
  }

  create(data: Prisma.UserCreateInput): Promise<StaffRow> {
    return this.prisma.user.create({ data, select: STAFF_SELECT });
  }

  update(id: string, data: Prisma.UserUpdateInput): Promise<StaffRow> {
    return this.prisma.user.update({ where: { id }, data, select: STAFF_SELECT });
  }
}

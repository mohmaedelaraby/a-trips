import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type { Prisma, User } from '../../../generated/prisma/client';

/**
 * Every database read and write for users.
 *
 * The service above decides *whether* something may happen — is the email
 * taken, is the account suspended — and this decides *how* it is stored. Keeping
 * the split means the rules can be read without Prisma noise, and a query can be
 * tuned without touching them.
 */
@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Caller passes an already-normalized email; see `normalizeEmail`. */
  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }
}

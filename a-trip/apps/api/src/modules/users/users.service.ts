import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import type { User } from '../../generated/prisma/client';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import { parseDateOnly } from '../../common/utils/date.util';

export type PublicUserDto = Omit<User, 'passwordHash' | 'dateOfBirth'> & {
  dateOfBirth: string | null;
};

const BCRYPT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  static toPublic(user: User): PublicUserDto {
    const { passwordHash: _passwordHash, dateOfBirth, ...rest } = user;
    return { ...rest, dateOfBirth: dateOfBirth ? dateOfBirth.toISOString().slice(0, 10) : null };
  }

  async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, BCRYPT_ROUNDS);
  }

  async verifyPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async getProfile(id: string): Promise<PublicUserDto> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return UsersService.toPublic(user);
  }

  async create(input: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    dateOfBirth?: string;
  }) {
    const email = input.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }
    return this.prisma.user.create({
      data: {
        name: input.name.trim(),
        email,
        passwordHash: await this.hashPassword(input.password),
        phone: input.phone?.trim() || null,
        dateOfBirth: input.dateOfBirth ? parseDateOnly(input.dateOfBirth) : null,
      },
    });
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<PublicUserDto> {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone?.trim() || null } : {}),
        ...(dto.dateOfBirth !== undefined
          ? { dateOfBirth: dto.dateOfBirth ? parseDateOnly(dto.dateOfBirth) : null }
          : {}),
      },
    });
    return UsersService.toPublic(user);
  }
}

import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { User } from '../../generated/prisma/client';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import { parseDateOnly } from '../../common/utils/date.util';
import { UsersRepository } from './repositories/users.repository';
import { hashPassword } from './utils/password.util';
import { normalizeEmail, toPublicUser, type PublicUserDto } from './utils/user.util';

export type { PublicUserDto } from './utils/user.util';

@Injectable()
export class UsersService {
  constructor(private readonly repository: UsersRepository) {}

  findByEmail(email: string): Promise<User | null> {
    return this.repository.findByEmail(normalizeEmail(email));
  }

  findById(id: string): Promise<User | null> {
    return this.repository.findById(id);
  }

  async getProfile(id: string): Promise<PublicUserDto> {
    const user = await this.repository.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return toPublicUser(user);
  }

  async create(input: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    dateOfBirth?: string;
  }): Promise<User> {
    const email = normalizeEmail(input.email);
    const existing = await this.repository.findByEmail(email);
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }
    return this.repository.create({
      name: input.name.trim(),
      email,
      passwordHash: await hashPassword(input.password),
      phone: input.phone?.trim() || null,
      dateOfBirth: input.dateOfBirth ? parseDateOnly(input.dateOfBirth) : null,
    });
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<PublicUserDto> {
    const user = await this.repository.update(id, {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone?.trim() || null } : {}),
      ...(dto.dateOfBirth !== undefined
        ? { dateOfBirth: dto.dateOfBirth ? parseDateOnly(dto.dateOfBirth) : null }
        : {}),
    });
    return toPublicUser(user);
  }
}

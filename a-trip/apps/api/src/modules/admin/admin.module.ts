import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminUsersService } from './admin-users.service';
import { AmenitiesService } from './amenities.service';
import { AdminController } from './admin.controller';
import { AdminRepository } from './repositories/admin.repository';
import { AdminUsersRepository } from './repositories/admin-users.repository';
import { AmenitiesRepository } from './repositories/amenities.repository';
import { UsersModule } from '../users/users.module';

@Module({
  // Needed for GET /admin/me: the admin portal's own "who am I", which has to
  // live under /admin so it is read with the admin-scoped session cookie
  // rather than the guest one (see session-cookie.ts).
  imports: [UsersModule],
  providers: [
    AdminService,
    AdminUsersService,
    AmenitiesService,
    AdminRepository,
    AdminUsersRepository,
    AmenitiesRepository,
  ],
  controllers: [AdminController],
})
export class AdminModule {}

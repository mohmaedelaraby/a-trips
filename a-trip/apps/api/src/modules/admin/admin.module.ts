import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminUsersService } from './admin-users.service';
import { AmenitiesService } from './amenities.service';
import { AdminController } from './admin.controller';
import { AdminRepository } from './repositories/admin.repository';
import { AdminUsersRepository } from './repositories/admin-users.repository';
import { AmenitiesRepository } from './repositories/amenities.repository';

@Module({
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

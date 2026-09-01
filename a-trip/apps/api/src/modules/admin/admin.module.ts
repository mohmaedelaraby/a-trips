import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AdminService } from './admin.service';
import { AdminUsersService } from './admin-users.service';
import { AmenitiesService } from './amenities.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [UsersModule],
  providers: [AdminService, AdminUsersService, AmenitiesService],
  controllers: [AdminController],
})
export class AdminModule {}

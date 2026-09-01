import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminUsersService } from './admin-users.service';
import { AmenitiesService } from './amenities.service';
import { InviteAdminUserDto, UpdateAdminUserDto } from './dto/admin-user.dto';
import { AmenityDto } from './dto/amenity.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/enums';

@ApiTags('admin')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly adminUsers: AdminUsersService,
    private readonly amenities: AmenitiesService,
  ) {}

  @Get('dashboard')
  dashboard() {
    return this.admin.dashboard();
  }

  // ------------------------------------------------------------ staff users

  @Get('users')
  listUsers() {
    return this.adminUsers.list();
  }

  @Post('users')
  inviteUser(@Body() dto: InviteAdminUserDto) {
    return this.adminUsers.invite(dto);
  }

  @Patch('users/:id')
  updateUser(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAdminUserDto) {
    return this.adminUsers.update(id, dto);
  }

  @Post('users/:id/resend-invite')
  resendInvite(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminUsers.resendInvite(id);
  }

  // ------------------------------------------------------------- amenities

  @Get('amenities')
  listAmenities() {
    return this.amenities.list();
  }

  @Post('amenities')
  createAmenity(@Body() dto: AmenityDto) {
    return this.amenities.create(dto);
  }

  @Patch('amenities/:id')
  updateAmenity(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AmenityDto) {
    return this.amenities.update(id, dto);
  }

  @Delete('amenities/:id')
  removeAmenity(@Param('id', ParseUUIDPipe) id: string) {
    return this.amenities.remove(id);
  }
}

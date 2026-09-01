import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { AdminBookingQueryDto, BookingDecisionDto } from './dto/booking.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/enums';

@ApiTags('admin/bookings')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/bookings')
export class AdminBookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Get()
  list(@Query() query: AdminBookingQueryDto) {
    return this.bookings.adminList(query);
  }

  @Patch(':id/confirm')
  confirm(@Param('id', ParseUUIDPipe) id: string, @Body() dto: BookingDecisionDto) {
    return this.bookings.confirm(id, dto);
  }

  @Patch(':id/reject')
  reject(@Param('id', ParseUUIDPipe) id: string, @Body() dto: BookingDecisionDto) {
    return this.bookings.reject(id, dto);
  }

  @Patch(':id/note')
  setNote(@Param('id', ParseUUIDPipe) id: string, @Body() dto: BookingDecisionDto) {
    return this.bookings.setAdminNote(id, dto.adminNote ?? '');
  }
}

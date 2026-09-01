import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AvailabilityService } from './availability.service';
import { BulkAvailabilityDto } from './dto/bulk-availability.dto';
import { StopSellDto } from './dto/stop-sell.dto';
import { CalendarQueryDto } from './dto/availability-query.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/enums';

@ApiTags('admin/availability')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/room-types/:roomTypeId/availability')
export class AdminAvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  @Get()
  calendar(
    @Param('roomTypeId', ParseUUIDPipe) roomTypeId: string,
    @Query() query: CalendarQueryDto,
  ) {
    return this.availability.getCalendar(roomTypeId, query.from, query.to);
  }

  @Post('bulk')
  bulk(@Param('roomTypeId', ParseUUIDPipe) roomTypeId: string, @Body() dto: BulkAvailabilityDto) {
    return this.availability.bulkSet(roomTypeId, dto);
  }

  @Patch('stop-sell')
  stopSell(@Param('roomTypeId', ParseUUIDPipe) roomTypeId: string, @Body() dto: StopSellDto) {
    return this.availability.setStopSell(roomTypeId, dto);
  }
}

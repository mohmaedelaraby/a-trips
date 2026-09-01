import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RoomTypesService } from './room-types.service';
import { CreateRoomTypeDto, UpdateRoomTypeDto } from './dto/room-type.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/enums';

@ApiTags('admin/room-types')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminRoomTypesController {
  constructor(private readonly roomTypes: RoomTypesService) {}

  @Get('hotels/:hotelId/room-types')
  list(@Param('hotelId', ParseUUIDPipe) hotelId: string) {
    return this.roomTypes.listForHotel(hotelId);
  }

  @Post('hotels/:hotelId/room-types')
  create(@Param('hotelId', ParseUUIDPipe) hotelId: string, @Body() dto: CreateRoomTypeDto) {
    return this.roomTypes.create(hotelId, dto);
  }

  @Get('room-types/:id')
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.roomTypes.findOne(id);
  }

  @Patch('room-types/:id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRoomTypeDto) {
    return this.roomTypes.update(id, dto);
  }

  @Delete('room-types/:id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.roomTypes.remove(id);
  }
}

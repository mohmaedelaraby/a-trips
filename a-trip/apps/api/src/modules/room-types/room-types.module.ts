import { Module } from '@nestjs/common';
import { RoomTypesService } from './room-types.service';
import { AdminRoomTypesController } from './room-types.controller';
import { RoomTypesRepository } from './repositories/room-types.repository';

@Module({
  providers: [RoomTypesService, RoomTypesRepository],
  controllers: [AdminRoomTypesController],
  exports: [RoomTypesService, RoomTypesRepository],
})
export class RoomTypesModule {}

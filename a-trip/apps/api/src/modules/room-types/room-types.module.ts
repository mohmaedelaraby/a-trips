import { Module } from '@nestjs/common';
import { RoomTypesService } from './room-types.service';
import { AdminRoomTypesController } from './room-types.controller';

@Module({
  providers: [RoomTypesService],
  controllers: [AdminRoomTypesController],
  exports: [RoomTypesService],
})
export class RoomTypesModule {}

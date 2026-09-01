import { Module } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { AdminAvailabilityController } from './availability.controller';

@Module({
  providers: [AvailabilityService],
  controllers: [AdminAvailabilityController],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}

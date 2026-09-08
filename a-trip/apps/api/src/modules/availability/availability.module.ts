import { Module } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { AdminAvailabilityController } from './availability.controller';
import { AvailabilityRepository } from './repositories/availability.repository';

@Module({
  providers: [AvailabilityService, AvailabilityRepository],
  controllers: [AdminAvailabilityController],
  exports: [AvailabilityService, AvailabilityRepository],
})
export class AvailabilityModule {}

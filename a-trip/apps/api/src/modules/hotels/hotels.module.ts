import { Module } from '@nestjs/common';
import { HotelsService } from './hotels.service';
import { HotelsController } from './hotels.controller';
import { AdminHotelsController } from './admin-hotels.controller';
import { AvailabilityModule } from '../availability/availability.module';
import { TranslationsModule } from '../translations/translations.module';
import { HotelsRepository } from './repositories/hotels.repository';

@Module({
  imports: [AvailabilityModule, TranslationsModule],
  providers: [HotelsService, HotelsRepository],
  controllers: [HotelsController, AdminHotelsController],
  exports: [HotelsService, HotelsRepository],
})
export class HotelsModule {}

import { Module } from '@nestjs/common';
import { HotelsService } from './hotels.service';
import { HotelsController } from './hotels.controller';
import { AdminHotelsController } from './admin-hotels.controller';
import { AvailabilityModule } from '../availability/availability.module';
import { TranslationsModule } from '../translations/translations.module';

@Module({
  imports: [AvailabilityModule, TranslationsModule],
  providers: [HotelsService],
  controllers: [HotelsController, AdminHotelsController],
  exports: [HotelsService],
})
export class HotelsModule {}

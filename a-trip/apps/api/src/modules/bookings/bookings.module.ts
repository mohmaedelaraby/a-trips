import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { AdminBookingsController } from './admin-bookings.controller';
import { AvailabilityModule } from '../availability/availability.module';
import { BookingsRepository } from './repositories/bookings.repository';

@Module({
  imports: [AvailabilityModule],
  providers: [BookingsService, BookingsRepository],
  controllers: [BookingsController, AdminBookingsController],
  exports: [BookingsService, BookingsRepository],
})
export class BookingsModule {}

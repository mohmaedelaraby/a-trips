import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { AdminBookingsController } from './admin-bookings.controller';
import { AvailabilityModule } from '../availability/availability.module';

@Module({
  imports: [AvailabilityModule],
  providers: [BookingsService],
  controllers: [BookingsController, AdminBookingsController],
  exports: [BookingsService],
})
export class BookingsModule {}

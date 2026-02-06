import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BookingCleanupService } from './booking-cleanup.service';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  imports: [PrismaModule],
  controllers: [BookingsController],
  providers: [BookingsService, BookingCleanupService],
  exports: [BookingsService],
})
export class BookingsModule {}

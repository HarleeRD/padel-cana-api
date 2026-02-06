import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BookingHoldsCleanupService {
  constructor(private readonly prisma: PrismaService) {}

  @Cron('*/1 * * * *')
  async cancelExpiredPendingBookings() {
    const now = new Date();

    await this.prisma.booking.updateMany({
      where: {
        status: BookingStatus.PENDING_PAYMENT,
        expiresAt: {
          lt: now,
        },
      },
      data: {
        status: BookingStatus.CANCELLED,
      },
    });
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BookingCleanupService {
  private readonly logger = new Logger(BookingCleanupService.name);

  constructor(private prisma: PrismaService) {}

  @Cron('*/1 * * * *')
  async cancelExpiredPendingPayments() {
    const now = new Date();

    const result = await this.prisma.booking.updateMany({
      where: {
        status: BookingStatus.PENDING_PAYMENT,
        expiresAt: { lt: now },
      },
      data: { status: BookingStatus.CANCELLED },
    });

    if (result.count > 0) {
      this.logger.log(`Cancelled ${result.count} expired pending bookings`);
    }
  }
}

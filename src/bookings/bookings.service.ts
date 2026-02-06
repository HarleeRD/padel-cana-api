import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async create(userId: string, dto: CreateBookingDto) {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
      throw new BadRequestException('Invalid time range');
    }

    if (startTime >= endTime) {
      throw new BadRequestException('Invalid time range');
    }

    const lockKey = `lock:court:${dto.courtId}:${startTime.toISOString()}`;
    const locked = await this.redis.acquireLock(lockKey, 30);
    if (!locked) {
      throw new BadRequestException('Time slot temporarily locked');
    }

    try {
      const now = new Date();
      const overlap = await this.prisma.booking.findFirst({
        where: {
          courtId: dto.courtId,
          startTime: { lt: endTime },
          endTime: { gt: startTime },
          OR: [
            { status: 'CONFIRMED' },
            { status: 'PENDING_PAYMENT', expiresAt: { gt: now } },
          ],
        },
      });

      if (overlap) {
        throw new BadRequestException('Time slot already booked');
      }

      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      return await this.prisma.booking.create({
        data: {
          userId,
          courtId: dto.courtId,
          startTime,
          endTime,
          status: 'PENDING_PAYMENT',
          expiresAt,
        },
      });
    } finally {
      await this.redis.releaseLock(lockKey);
    }
  }

  findMine(userId: string) {
    return this.prisma.booking.findMany({
      where: { userId },
      orderBy: { startTime: 'asc' },
      include: { court: true },
    });
  }

  findByClubAndDate(clubId: string, date: string) {
    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    return this.prisma.booking.findMany({
      where: {
        court: { clubId },
        startTime: { lt: dayEnd },
        endTime: { gt: dayStart },
      },
      orderBy: { startTime: 'asc' },
      include: {
        court: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            clubId: true,
            language: true,
            createdAt: true,
          },
        },
      },
    });
  }
}

import { BadRequestException, Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { normalizeToYMD } from '../common/date';

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async create(userId: string, dto: CreateBookingDto) {
    const start = DateTime.fromISO(dto.startTime, { setZone: true }).toUTC();
    const end = DateTime.fromISO(dto.endTime, { setZone: true }).toUTC();

    if (!start.isValid || !end.isValid || end <= start) {
      throw new BadRequestException('Invalid time range');
    }

    const startTime = start.toJSDate();
    const endTime = end.toJSDate();

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

      return await this.prisma.booking.create({
        data: {
          userId,
          courtId: dto.courtId,
          startTime,
          endTime,
          status: 'CONFIRMED',
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
    let normalizedDate: string;
    try {
      normalizedDate = normalizeToYMD(date);
    } catch {
      throw new BadRequestException(
        'Invalid date. Expected YYYY-MM-DD, ISO timestamp, or unix timestamp (ms)',
      );
    }

    const dayStart = new Date(`${normalizedDate}T00:00:00.000Z`);
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

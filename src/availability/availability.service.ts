import { BadRequestException, Injectable } from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async getAvailability(
    clubIdOrParams: string | { clubId: string; date: string },
    dateParam?: string,
  ) {
    const clubId =
      typeof clubIdOrParams === 'string' ? clubIdOrParams : clubIdOrParams.clubId;
    const date =
      typeof clubIdOrParams === 'string' ? dateParam : clubIdOrParams.date;

    if (!clubId) {
      throw new BadRequestException('clubId is required');
    }

    if (!date) {
      throw new BadRequestException('date is required (YYYY-MM-DD)');
    }

    const now = new Date();

    const dayStart = new Date(`${date}T00:00:00.000Z`);
    if (Number.isNaN(dayStart.getTime())) {
      throw new BadRequestException('Invalid date. Expected YYYY-MM-DD');
    }

    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    const slots = this.generateSlots(date);

    const courts = await this.prisma.court.findMany({
      where: { clubId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        price: true,
      },
    });

    const bookings = await this.prisma.booking.findMany({
      where: {
        court: { clubId },
        startTime: { lt: dayEnd },
        endTime: { gt: dayStart },
        OR: [
          { status: BookingStatus.CONFIRMED },
          {
            status: BookingStatus.PENDING_PAYMENT,
            expiresAt: { gt: now },
          },
        ],
      },
      select: {
        id: true,
        courtId: true,
        startTime: true,
        endTime: true,
        status: true,
        expiresAt: true,
      },
      orderBy: { startTime: 'asc' },
    });

    return {
      clubId,
      date,
      courts: courts.map((court) => {
        const courtBookings = bookings.filter((b) => b.courtId === court.id);

        return {
          courtId: court.id,
          courtName: court.name,
          slots: slots.map((slot) => {
            const isOccupied = courtBookings.some(
              (b) => slot.start < b.endTime && slot.end > b.startTime,
            );

            return {
              start: slot.start.toISOString(),
              end: slot.end.toISOString(),
              available: !isOccupied,
              price: court.price,
            };
          }),
        };
      }),
    };
  }

  private generateSlots(date: string) {
    const slots: Array<{ start: Date; end: Date }> = [];
    const slotMinutes = 90;

    let current = new Date(`${date}T08:00:00.000Z`);
    const end = new Date(`${date}T22:00:00.000Z`);

    while (current < end) {
      const slotStart = new Date(current);
      const slotEnd = new Date(current.getTime() + slotMinutes * 60 * 1000);

      if (slotEnd <= end) {
        slots.push({ start: slotStart, end: slotEnd });
      }

      current = slotEnd;
    }

    return slots;
  }
}

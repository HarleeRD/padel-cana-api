import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AvailabilityService } from './availability.service';
import { normalizeToYMDWithTZ } from '../common/date';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Availability')
@Controller('availability')
export class AvailabilityController {
  constructor(
    private readonly availabilityService: AvailabilityService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async getAvailability(@Query('clubId') clubId: string, @Query('date') date: string) {
    if (!clubId || !date) {
      throw new BadRequestException('clubId and date are required');
    }

    const club = await this.prisma.club.findUnique({ where: { id: clubId } });
    if (!club) {
      throw new NotFoundException('Club not found');
    }

    let ymd: string;
    try {
      ymd = normalizeToYMDWithTZ(date, club.timezone);
    } catch {
      throw new BadRequestException(
        'Invalid date. Expected YYYY-MM-DD, ISO timestamp, or unix timestamp (ms)',
      );
    }

    return this.availabilityService.getAvailability({ clubId, date: ymd });
  }
}

import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { AvailabilityService } from './availability.service';

@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get()
  getAvailability(@Query('clubId') clubId: string, @Query('date') date: string) {
    if (!clubId || !date) {
      throw new BadRequestException('clubId and date are required');
    }

    return this.availabilityService.getAvailability(clubId, date);
  }
}

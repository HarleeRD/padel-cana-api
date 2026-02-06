import { BadRequestException, Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { BookingsService } from '../bookings/bookings.service';

type RequestWithUser = Request & {
  user?: { userId?: string; role?: string; clubId?: string };
};

@Controller('admin')
export class AdminController {
  constructor(private readonly bookingsService: BookingsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CLUB_ADMIN')
  @Get('bookings')
  getAdminBookings(@Req() req: RequestWithUser, @Query('date') date?: string) {
    const clubId = req.user?.clubId;
    if (!clubId) {
      throw new BadRequestException('clubId is required');
    }

    const effectiveDate = date ?? new Date().toISOString().slice(0, 10);
    return this.bookingsService.findByClubAndDate(clubId, effectiveDate);
  }
}

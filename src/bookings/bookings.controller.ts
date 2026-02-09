import { BadRequestException, Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingsService } from './bookings.service';

type RequestWithUser = Request & {
  user?: { userId?: string; role?: string; clubId?: string };
};

@ApiTags('Bookings')
@ApiBearerAuth('access-token')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @UseGuards(JwtAuthGuard)
  @((Throttle as any)(10, 60))
  @Post()
  create(@Req() req: RequestWithUser, @Body() dto: CreateBookingDto) {
    const userId = req.user?.userId ?? (req.user as any)?.id;
    if (!userId) {
      throw new BadRequestException('userId is required');
    }

    return this.bookingsService.create(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  myBookings(@Req() req: RequestWithUser) {
    const userId = req.user?.userId;
    return this.bookingsService.findMine(userId ?? '');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CLUB_ADMIN')
  @Get('admin/bookings')
  getClubBookings(@Req() req: RequestWithUser, @Query('date') date: string) {
    const clubId = req.user?.clubId;
    if (!clubId || !date) {
      throw new BadRequestException('clubId and date are required');
    }

    return this.bookingsService.findByClubAndDate(clubId, date);
  }
}

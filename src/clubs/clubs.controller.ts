import { Body, Controller, Get, NotFoundException, Param, Post } from '@nestjs/common';
import { ApiParam, ApiTags } from '@nestjs/swagger';
import { Club } from '@prisma/client';
import { ClubsService } from './clubs.service';
import { CreateClubDto } from './dto/create-club.dto';

@ApiTags('Clubs')
@Controller('clubs')
export class ClubsController {
  constructor(private readonly clubsService: ClubsService) {}

  @Get()
  findAll() {
    return this.clubsService.findAll();
  }

  @Get(':id/courts')
  @ApiParam({
    name: 'id',
    description: 'UUID del club',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  async getCourtsByClubId(@Param('id') clubId: string) {
    const club = await this.clubsService.findById(clubId);
    if (!club) {
      throw new NotFoundException('Club not found');
    }

    return this.clubsService.getCourtsByClubId(clubId);
  }

  @Post()
  create(@Body() dto: CreateClubDto): Promise<Club> {
    return this.clubsService.create(dto);
  }
}

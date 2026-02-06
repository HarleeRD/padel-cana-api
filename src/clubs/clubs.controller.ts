import { Body, Controller, Get, Post } from '@nestjs/common';
import { Club } from '@prisma/client';
import { ClubsService } from './clubs.service';
import { CreateClubDto } from './dto/create-club.dto';

@Controller('clubs')
export class ClubsController {
  constructor(private readonly clubsService: ClubsService) {}

  @Get()
  findAll() {
    return this.clubsService.findAll();
  }

  @Post()
  create(@Body() dto: CreateClubDto): Promise<Club> {
    return this.clubsService.create(dto);
  }
}

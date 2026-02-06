import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClubDto } from './dto/create-club.dto';

@Injectable()
export class ClubsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.club.findMany({ orderBy: { createdAt: 'desc' } });
  }

  create(dto: CreateClubDto) {
    return this.prisma.club.create({
      data: {
        name: dto.name,
        location: dto.location,
        isResort: dto.isResort ?? false,
      },
    });
  }
}

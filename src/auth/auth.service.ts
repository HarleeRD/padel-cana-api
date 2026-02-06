import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(email: string, name: string, password: string) {
    const normalizedEmail = email?.trim().toLowerCase();
    const normalizedName = name?.trim();

    if (!normalizedEmail || !normalizedName || !password) {
      throw new BadRequestException('email, name and password are required');
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });
    if (existing) throw new BadRequestException('Email already in use');

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        name: normalizedName,
        passwordHash,
        role: 'PLAYER',
        language: 'ES',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        clubId: true,
        language: true,
      },
    });

    const token = await this.jwtService.signAsync({
      sub: user.id,
      role: user.role,
      clubId: user.clubId,
    });

    return { user, accessToken: token };
  }

  async login(email: string, password: string) {
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      throw new BadRequestException('email and password are required');
    }

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        clubId: true,
        language: true,
        passwordHash: true,
      },
    });

    if (!user?.passwordHash) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const token = await this.jwtService.signAsync({
      sub: user.id,
      role: user.role,
      clubId: user.clubId,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        clubId: user.clubId,
        language: user.language,
      },
      accessToken: token,
    };
  }
}

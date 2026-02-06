import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { BookingsService } from './../src/bookings/bookings.service';
import { createTestToken } from './helpers/jwt.helper';

describe('RBAC + Club Scoping (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  let bookingsService: { findByClubAndDate: jest.Mock };

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret';
    process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '7d';

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { AppModule } = require('./../src/app.module');

    bookingsService = {
      findByClubAndDate: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(BookingsService)
      .useValue(bookingsService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    jwtService = new JwtService({ secret: process.env.JWT_SECRET });
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /admin/bookings returns 403 for non-admin', async () => {
    const token = createTestToken(jwtService, {
      sub: 'user-1',
      role: 'PLAYER',
      clubId: 'club-a',
    });

    await request(app.getHttpServer())
      .get('/admin/bookings')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('GET /admin/bookings returns 200 for CLUB_ADMIN', async () => {
    const token = createTestToken(jwtService, {
      sub: 'admin-1',
      role: 'CLUB_ADMIN',
      clubId: 'club-a',
    });

    bookingsService.findByClubAndDate.mockResolvedValue([]);

    await request(app.getHttpServer())
      .get('/admin/bookings?date=2026-02-05')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(bookingsService.findByClubAndDate).toHaveBeenCalledWith(
      'club-a',
      '2026-02-05',
    );
  });

  it('GET /admin/bookings is scoped by clubId from token', async () => {
    const token = createTestToken(jwtService, {
      sub: 'admin-2',
      role: 'CLUB_ADMIN',
      clubId: 'club-b',
    });

    bookingsService.findByClubAndDate.mockResolvedValue([]);

    await request(app.getHttpServer())
      .get('/admin/bookings?date=2026-02-05')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(bookingsService.findByClubAndDate).toHaveBeenCalledWith(
      'club-b',
      '2026-02-05',
    );
  });
});

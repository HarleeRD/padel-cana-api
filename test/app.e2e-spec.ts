import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtService } from '@nestjs/jwt';
import { BookingsService } from './../src/bookings/bookings.service';
import { createTestToken } from './helpers/jwt.helper';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  let bookingsService: { findByClubAndDate: jest.Mock };

  beforeEach(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret';
    process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '7d';

    // AppModule imports AuthModule which fail-fast throws if JWT_SECRET is missing.
    // We set env vars above and require AppModule lazily.
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

    jwtService = new JwtService({
      secret: process.env.JWT_SECRET,
    });
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/admin/bookings (GET) rejects non-admin (403)', async () => {
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

  it('/admin/bookings (GET) allows admin and scopes by clubId from token (200)', async () => {
    const token = createTestToken(jwtService, {
      sub: 'admin-1',
      role: 'CLUB_ADMIN',
      clubId: 'club-a',
    });

    bookingsService.findByClubAndDate.mockResolvedValue([
      { id: 'b1', courtId: 'c1', startTime: new Date().toISOString() },
    ]);

    const res = await request(app.getHttpServer())
      .get('/admin/bookings?date=2026-02-05')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(bookingsService.findByClubAndDate).toHaveBeenCalledWith(
      'club-a',
      '2026-02-05',
    );
    expect(res.body).toEqual([
      { id: 'b1', courtId: 'c1', startTime: expect.any(String) },
    ]);
  });
});

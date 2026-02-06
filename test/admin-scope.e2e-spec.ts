import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { BookingsService } from './../src/bookings/bookings.service';
import { createTestToken } from './helpers/jwt.helper';

describe('Admin scope by clubId (e2e)', () => {
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

  it('uses clubId from JWT, not from query/body', async () => {
    const token = createTestToken(jwtService, {
      sub: 'admin-1',
      role: 'CLUB_ADMIN',
      clubId: 'club-a',
    });

    bookingsService.findByClubAndDate.mockResolvedValue([]);

    await request(app.getHttpServer())
      .get('/admin/bookings?date=2026-02-05&clubId=club-b')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(bookingsService.findByClubAndDate).toHaveBeenCalledWith(
      'club-a',
      '2026-02-05',
    );
  });

  it('admin from club A cannot see bookings from club B (scoping)', async () => {
    const token = createTestToken(jwtService, {
      sub: 'admin-2',
      role: 'CLUB_ADMIN',
      clubId: 'club-a',
    });

    bookingsService.findByClubAndDate.mockResolvedValue([
      { id: 'b1', courtId: 'c1' },
    ]);

    const res = await request(app.getHttpServer())
      .get('/admin/bookings?date=2026-02-05')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(bookingsService.findByClubAndDate).toHaveBeenCalledWith(
      'club-a',
      '2026-02-05',
    );
    expect(res.body).toEqual([{ id: 'b1', courtId: 'c1' }]);
  });
});

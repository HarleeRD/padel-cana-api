import { JwtService } from '@nestjs/jwt';

export function createTestToken(
  jwt: JwtService,
  payload: {
    sub: string;
    role: 'PLAYER' | 'CLUB_ADMIN' | 'STAFF';
    clubId?: string | null;
  },
) {
  return jwt.sign({
    sub: payload.sub,
    role: payload.role,
    clubId: payload.clubId ?? null,
  });
}

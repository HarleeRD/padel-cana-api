import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    if (req.user?.userId) return `user:${req.user.userId}`;

    const xff = req.headers?.['x-forwarded-for'];
    const forwardedIp = Array.isArray(xff) ? xff[0] : xff?.split?.(',')?.[0];
    const ip = forwardedIp ?? req.ip;

    return `ip:${ip ?? 'unknown'}`;
  }
}

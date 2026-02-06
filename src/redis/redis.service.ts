import { Injectable } from '@nestjs/common';

@Injectable()
export class RedisService {
  private locks = new Map<string, NodeJS.Timeout>();

  async acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
    if (this.locks.has(key)) return false;

    const timeout = setTimeout(() => {
      this.locks.delete(key);
    }, ttlSeconds * 1000);

    this.locks.set(key, timeout);
    return true;
  }

  async releaseLock(key: string): Promise<void> {
    const timeout = this.locks.get(key);
    if (timeout) {
      clearTimeout(timeout);
    }
    this.locks.delete(key);
  }
}

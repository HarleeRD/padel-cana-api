import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const connectionString = process.env['DATABASE_URL'];
    const sslDisabled = !!connectionString && /[?&]sslmode=disable(?:&|$)/i.test(connectionString);
    const shouldUseInsecureSsl = !!connectionString && !sslDisabled;

    const pgPoolConnectionString = connectionString
      ? PrismaService.stripSslMode(connectionString)
      : connectionString;

    const schema = PrismaService.getSchema(connectionString);

    let parsedInfo: {
      hostname?: string;
      port?: string;
      username?: string;
      hasNewline?: boolean;
      pgHostname?: string;
      pgPort?: string;
      pgUsername?: string;
    } = {};
    if (connectionString) {
      try {
        const u = new URL(connectionString);
        parsedInfo = {
          hostname: u.hostname,
          port: u.port,
          username: u.username,
          hasNewline: /\r|\n/.test(connectionString),
        };
      } catch {
        parsedInfo = {
          hasNewline: /\r|\n/.test(connectionString),
        };
      }
    }

    if (pgPoolConnectionString) {
      try {
        const u = new URL(pgPoolConnectionString);
        parsedInfo = {
          ...parsedInfo,
          pgHostname: u.hostname,
          pgPort: u.port,
          pgUsername: u.username,
        };
      } catch {
        // ignore
      }
    }

    Logger.log(
      `PrismaService init: hasDatabaseUrl=${!!connectionString} sslDisabled=${sslDisabled} applyInsecureSsl=${shouldUseInsecureSsl} parsed=${JSON.stringify(parsedInfo)}`,
      PrismaService.name,
    );

    super({
      adapter: new PrismaPg(
        new Pool({
          connectionString: pgPoolConnectionString,
          ...(schema ? { options: `-c search_path=${schema}` } : {}),
          ...(shouldUseInsecureSsl
            ? {
                ssl: {
                  rejectUnauthorized: false,
                },
              }
            : {}),
        }),
      ),
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  private static stripSslMode(url: string): string {
    try {
      const u = new URL(url);
      u.searchParams.delete('sslmode');

      // preserve empty query formatting
      const out = u.toString();
      return out;
    } catch {
      return url;
    }
  }

  private static getSchema(url: string | undefined): string | undefined {
    if (!url) return undefined;
    try {
      const u = new URL(url);
      const schema = u.searchParams.get('schema') ?? undefined;
      return schema || undefined;
    } catch {
      return undefined;
    }
  }
}

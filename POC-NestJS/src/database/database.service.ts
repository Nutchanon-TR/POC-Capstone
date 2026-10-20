import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, QueryResultRow } from 'pg';

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  private readonly pool: Pool;

  constructor(configService: ConfigService) {
    // Create one reusable PostgreSQL connection pool.
    this.pool = new Pool({
      connectionString: configService.getOrThrow<string>('DATABASE_URL'),
    });
  }

  query<T extends QueryResultRow>(text: string, values: unknown[] = []) {
    // Run parameterized SQL to avoid SQL injection.
    return this.pool.query<T>(text, values);
  }

  async onApplicationShutdown() {
    // Close open database connections.
    await this.pool.end();
  }
}

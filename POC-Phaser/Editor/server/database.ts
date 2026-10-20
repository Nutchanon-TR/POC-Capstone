import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
@Injectable()
export class Database implements OnModuleDestroy {
  readonly pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  async migrate() {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT pg_advisory_xact_lock(hashtext('connecta_editor_migrations'))");
      await client.query(
        'CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())',
      );
      const directory = path.resolve('server/migrations');
      for (const name of (await readdir(directory)).filter((n) => n.endsWith('.sql')).sort()) {
        if (
          (await client.query('SELECT name FROM schema_migrations WHERE name=$1', [name])).rowCount
        )
          continue;
        await client.query(await readFile(path.join(directory, name), 'utf8'));
        await client.query('INSERT INTO schema_migrations(name) VALUES($1)', [name]);
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  async onModuleDestroy() {
    await this.pool.end();
  }
}

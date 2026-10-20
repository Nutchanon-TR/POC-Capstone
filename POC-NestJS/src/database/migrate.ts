import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Pool } from 'pg';

async function migrate() {
  // Apply the SQL file without an ORM.
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is missing. Create .env from .env.example first.');
  }

  const sqlPath = join(process.cwd(), 'sql', '001_create_tasks.sql');
  const sql = await readFile(sqlPath, 'utf8');
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    await pool.query(sql);
    console.log('Migration completed: tasks table is ready.');
  } finally {
    await pool.end();
  }
}

void migrate();

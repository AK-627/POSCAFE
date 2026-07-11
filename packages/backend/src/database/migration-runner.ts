/**
 * Migration Runner
 *
 * Reads SQL migration files in order and applies them to the database.
 * Tracks applied migrations in a `schema_migrations` table.
 *
 * Run: npx ts-node -r tsconfig-paths/register src/database/migration-runner.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'pg';

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

interface MigrationRecord {
  id: number;
  filename: string;
  applied_at: Date;
}

async function ensureMigrationsTable(client: Client): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id          SERIAL PRIMARY KEY,
      filename    VARCHAR(255) NOT NULL UNIQUE,
      applied_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations(client: Client): Promise<Set<string>> {
  const result = await client.query<MigrationRecord>('SELECT filename FROM schema_migrations ORDER BY id');
  return new Set(result.rows.map((r: MigrationRecord) => r.filename));
}

async function runMigrations(): Promise<void> {
  const client = new Client({
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432'),
    user: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    database: process.env.DB_DATABASE ?? 'skynether',
  });

  await client.connect();
  console.log('Connected to database.');

  try {
    await ensureMigrationsTable(client);

    const applied = await getAppliedMigrations(client);

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort(); // lexicographic order: 001_, 002_, ...

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`  [SKIP] ${file} (already applied)`);
        continue;
      }

      const filepath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(filepath, 'utf-8');

      console.log(`  [RUNNING] ${file}...`);

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`  [DONE] ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`  [FAILED] ${file}:`, err);
        throw err;
      }
    }

    console.log('\nAll migrations applied successfully.');
  } finally {
    await client.end();
  }
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

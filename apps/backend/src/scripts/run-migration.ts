import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  const migrationDir = path.join(__dirname, '../../drizzle');
  const migrations = ['0008_colossal_captain_midlands.sql', '0009_yellow_apocalypse.sql'];
  const client = await pool.connect();
  for (const migration of migrations) {
    const sqlPath = path.join(migrationDir, migration);
    if (!fs.existsSync(sqlPath)) {
      console.warn(`Migration file not found: ${migration}, skipping.`);
      continue;
    }
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    const statements = sql.split('--> statement-breakpoint');
    console.log(`Running migration ${migration} (${statements.length} statements)...`);
    for (let statement of statements) {
      statement = statement.trim();
      if (!statement) continue;
      console.log(`Executing: ${statement.substring(0, 100)}...`);
      try {
        await client.query(statement);
        console.log('Success.');
      } catch (error: unknown) {
        const pgError = error as { code?: string; message?: string };
        if (pgError.code === '42701' || pgError.code === '42P07') {
          console.warn(`Warning skipped: ${pgError.message}`);
        } else {
          console.error(`Error executing statement:`, error);
        }
      }
    }
  }
  client.release();
  await pool.end();
  console.log('Migration runner finished.');
}

run();

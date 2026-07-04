import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  const sqlPath = path.join(__dirname, '../../drizzle/0008_colossal_captain_midlands.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');
  
  const statements = sql.split('--> statement-breakpoint');
  
  console.log(`Running ${statements.length} migration statements...`);
  
  const client = await pool.connect();
  for (let statement of statements) {
    statement = statement.trim();
    if (!statement) continue;
    console.log(`Executing: ${statement.substring(0, 100)}...`);
    try {
      await client.query(statement);
      console.log('Success.');
    } catch (error: any) {
      if (error.code === '42701' || error.code === '42P07') {
        console.warn(`Warning skipped: ${error.message}`);
      } else {
        console.error(`Error executing statement:`, error);
      }
    }
  }
  client.release();
  await pool.end();
  console.log('Migration runner finished.');
}

run();

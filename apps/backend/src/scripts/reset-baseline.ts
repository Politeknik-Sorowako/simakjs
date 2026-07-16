import { execSync } from 'child_process';
import { join } from 'path';
import { Pool } from 'pg';

function ts() {
  return new Date().toISOString();
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('[ERROR] DATABASE_URL environment variable is required');
    process.exit(1);
  }

  console.log('');
  console.log('========================================');
  console.log('    RESET DATABASE TO BASELINE');
  console.log('    ' + ts());
  console.log('========================================');
  console.log('');

  console.log('[1/6] Backing up current database...');
  try {
    execSync('bun run src/scripts/backup-db.ts', { stdio: 'inherit', timeout: 120000, cwd: process.cwd() });
    console.log('[OK] Backup completed.');
  } catch {
    console.log('[WARN] Backup skipped (pg_dump not available in this environment).');
  }

  console.log('[2/6] Dropping all tables and enums...');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    // Drop all tables with CASCADE
    await pool.query(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
      END $$;
    `);
    console.log('[OK] All tables dropped.');

    // Drop all enums
    await pool.query(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT typname FROM pg_type WHERE typtype = 'e' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) LOOP
          EXECUTE 'DROP TYPE IF EXISTS ' || quote_ident(r.typname) || ' CASCADE';
        END LOOP;
      END $$;
    `);
    console.log('[OK] All enums dropped.');
    await pool.end();
  } catch (err: any) {
    console.error('[FAILED] Failed to drop objects:', err.message);
    await pool.end();
    process.exit(1);
  }

  console.log('[3/6] Running ensure-enums...');
  try {
    execSync('bun run src/scripts/ensure-enums.ts', { stdio: 'inherit', timeout: 30000, cwd: process.cwd() });
    console.log('[OK] Enums ensured.');
  } catch (err: any) {
    console.error('[FAILED] Enum validation failed:', err.message);
    process.exit(1);
  }

  console.log('[4/6] Running drizzle-kit push (create all tables)...');
  try {
    execSync('bunx drizzle-kit push', { stdio: 'inherit', timeout: 120000, cwd: process.cwd() });
    console.log('[OK] All tables created.');
  } catch (err: any) {
    console.error('[FAILED] drizzle-kit push failed:', err.message);
    process.exit(1);
  }

  console.log('[5/6] Seeding admin user...');
  try {
    execSync('bun run src/scripts/seed-admin.ts', { stdio: 'inherit', timeout: 30000, cwd: process.cwd() });
    console.log('[OK] Admin user seeded.');
  } catch (err: any) {
    console.error('[FAILED] Admin seed failed:', err.message);
    process.exit(1);
  }

  console.log('[6/6] Verifying schema...');
  try {
    const verifyPool = new Pool({ connectionString: process.env.DATABASE_URL });
    const result = await verifyPool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
    );
    console.log('[OK] Tables created:');
    for (const row of result.rows) {
      console.log('  - ' + row.table_name);
    }
    console.log('Total: ' + result.rows.length + ' tables');
    await verifyPool.end();
  } catch (err: any) {
    console.log('[WARN] Verification query failed:', err.message);
  }

  console.log('');
  console.log('========================================');
  console.log('    DATABASE RESET COMPLETED');
  console.log('    ' + ts());
  console.log('========================================');
  console.log('');
}

main();

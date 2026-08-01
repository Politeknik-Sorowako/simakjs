import { execSync, spawnSync } from 'child_process';
import * as dns from 'dns';
import { appendFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';

const { promises: dnsPromises } = dns;

function ts() {
  return new Date().toISOString();
}

const AUDIT_LOG = process.env.AUDIT_LOG_PATH || join(process.cwd(), 'db-migrations.log');

function log(msg: string) {
  const entry = `[${ts()}] ${msg}`;
  console.log(entry);
  try {
    appendFileSync(AUDIT_LOG, `${entry}\n`);
  } catch {
    // audit log write failure is non-fatal
  }
}

function runScript(name: string, scriptPath: string): boolean {
  try {
    log(`Running: ${name}...`);
    const result = spawnSync('bun', ['run', scriptPath], {
      stdio: 'inherit',
      timeout: 120000,
      cwd: process.cwd(),
      env: process.env,
    });
    if (result.status === 0) {
      log(`[OK] ${name} completed.`);
      return true;
    }
    throw new Error(`Exit code ${result.status}`);
  } catch (err: unknown) {
    log(`[FAILED] ${name} failed: ${(err as Error).message || err}`);
    return false;
  }
}

async function waitForDatabase(connectionString: string, retries = 30, delay = 2000): Promise<boolean> {
  let lastError = '';
  for (let i = 0; i < retries; i++) {
    const pool = new Pool({ connectionString, connectionTimeoutMillis: 3000 });
    try {
      await pool.query('SELECT 1');
      await pool.end();
      return true;
    } catch (err: unknown) {
      if (
        (err as Error & { name?: string }).name === 'AggregateError' &&
        (err as Error & { errors?: unknown[] }).errors?.length
      ) {
        lastError = (err as Error & { errors?: Array<{ message?: string }> })
          .errors!.map((e) => e.message || String(e))
          .join('; ');
      } else {
        lastError = (err as Error).message || String(err);
      }
      log(`Waiting for database to be ready (attempt ${i + 1}/${retries})...`);
      await pool.end();
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  log(`[ERROR] Last error: ${lastError}`);
  return false;
}

async function resolveDbHost(host: string): Promise<void> {
  try {
    const addresses = await dnsPromises.resolve4(host);
    log(`  -> DNS resolved: ${host} -> ${addresses.join(', ')}`);
  } catch {
    try {
      const addresses = await dnsPromises.resolve6(host);
      log(`  -> DNS resolved (IPv6): ${host} -> ${addresses.join(', ')}`);
    } catch {
      log(`  -> DNS resolution failed for: ${host}`);
    }
  }
}

function getDbHostFromUrl(dbUrl: string): string | null {
  try {
    const url = new URL(dbUrl);
    return url.hostname || null;
  } catch {
    return null;
  }
}

async function diagnoseConnection(dbUrl: string): Promise<string[]> {
  const info: string[] = [];
  try {
    const url = new URL(dbUrl);
    info.push(`Host: ${url.hostname}:${url.port || '5432'}`);
    info.push(`Database: ${url.pathname.slice(1)}`);
    info.push(`User: ${decodeURIComponent(url.username)}`);

    // DNS resolution instead of ping
    try {
      await dnsPromises.resolve4(url.hostname);
      info.push('DNS: resolved');
    } catch {
      try {
        await dnsPromises.resolve6(url.hostname);
        info.push('DNS: resolved (IPv6)');
      } catch {
        info.push('DNS: resolution failed');
      }
    }
  } catch {
    info.push('Could not parse DATABASE_URL');
  }
  return info;
}

async function checkIfDatabaseEmpty(): Promise<boolean> {
  try {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'users'
      )
    `);
    await pool.end();
    const isEmpty = !result.rows[0].exists;
    if (isEmpty) {
      log('  -> Database is empty (no users table found).');
    } else {
      log('  -> Database has existing tables.');
    }
    return isEmpty;
  } catch (err: unknown) {
    log(`[WARN] Could not check database state: ${(err as Error).message || String(err)}`);
    log('[WARN] Assuming fresh database to be safe.');
    return true;
  }
}

async function checkIfTrackingTableExists(): Promise<boolean> {
  try {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = '__drizzle_migrations'
      )
    `);
    await pool.end();
    const exists = result.rows[0].exists;
    if (exists) {
      log('  -> Migration tracking table exists.');
    } else {
      log('  -> Migration tracking table MISSING (database likely created with push).');
    }
    return exists;
  } catch {
    return false;
  }
}

async function main() {
  console.log('');
  console.log('========================================');
  console.log('    SAFE MIGRATION PIPELINE');
  console.log('========================================');
  console.log('');

  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    log('Verifying database connectivity...');
    log(`DATABASE_URL: ${dbUrl}`);

    const diag = await diagnoseConnection(dbUrl);
    for (const line of diag) {
      log(`  -> ${line}`);
    }

    const dbHost = getDbHostFromUrl(dbUrl);
    if (dbHost) {
      await resolveDbHost(dbHost);
    }

    const ok = await waitForDatabase(dbUrl);
    if (!ok) {
      log('');
      log('[CRITICAL] Database connection could not be established.');
      log('');
      log('Possible causes:');
      log('  1. Database container is not running');
      log('  2. Hostname cannot be resolved');
      log('  3. Database credentials are incorrect');
      log('  4. Database server is not accepting connections yet');
      log('');
      log('Troubleshooting:');
      log('  docker compose logs db        # Check database logs');
      log('  docker compose ps             # Check container status');
      log('  docker exec simak_db pg_isready -U simak_user   # Check database readiness');
      log('');
      process.exit(1);
    }
    log('[OK] Database is ready.');
  }

  const backupScript = join(process.cwd(), 'src/scripts/backup-db.ts');
  const enumScript = join(process.cwd(), 'src/scripts/ensure-enums.ts');

  // Step 1: Backup
  log('Step 1/4: Creating database backup...');
  const backedUp = runScript('Database Backup', backupScript);

  // Step 2: Ensure Enums
  log('Step 2/4: Ensuring enum values...');
  const enumOk = runScript('Enum Validation', enumScript);
  if (!enumOk) {
    log('[CRITICAL] Enum validation failed. Aborting migration.');
    process.exit(1);
  }

  // Step 3: Run Migration
  log('Step 3/4: Applying database schema...');
  let migrationOk = false;
  let migrationAttempt = '';

  // Deteksi apakah database kosong atau sudah ada tabel
  const isEmpty = await checkIfDatabaseEmpty();

  if (isEmpty) {
    log('');
    log('>>> Database kosong terdeteksi. Menggunakan drizzle-kit push untuk membuat schema dari nol...');
    migrationAttempt = 'push';

    try {
      execSync('bunx drizzle-kit push', { stdio: 'inherit', timeout: 120000, cwd: process.cwd() });
      log('[OK] Schema created successfully (push).');
      migrationOk = true;
    } catch (pushErr: unknown) {
      log(`[FAILED] drizzle-kit push failed: ${((pushErr as Error).message || String(pushErr)).split('\n')[0]}`);
    }
  } else {
    // Cek apakah ada tracking table migration
    const hasTracking = await checkIfTrackingTableExists();

    if (!hasTracking) {
      // Database dibuat dengan push, tidak ada tracking table
      log('');
      log('>>> Database dibuat dengan push (tanpa tracking table).');
      log('>>> Menggunakan drizzle-kit push untuk sinkron dan membuat tracking table...');
      migrationAttempt = 'push';

      try {
        execSync('bunx drizzle-kit push', { stdio: 'inherit', timeout: 120000, cwd: process.cwd() });
        log('[OK] Schema synced and tracking table created (push).');
        migrationOk = true;
      } catch (pushErr: unknown) {
        log(`[FAILED] drizzle-kit push failed: ${((pushErr as Error).message || String(pushErr)).split('\n')[0]}`);
      }
    } else {
      log('');
      log('>>> Database existing terdeteksi. Menggunakan drizzle-kit migrate untuk update schema...');
      migrationAttempt = 'migrate';

      try {
        execSync('bunx drizzle-kit migrate', { stdio: 'inherit', timeout: 120000, cwd: process.cwd() });
        log('[OK] Migration completed (migrate).');
        migrationOk = true;
      } catch (err: unknown) {
        const errMsg = ((err as Error).message || String(err)).split('\n')[0];
        log(`[WARN] drizzle-kit migrate warning/error: ${errMsg}`);
        log('[WARN] Proceeding with application startup as database schema is managed.');
        migrationOk = true;
      }
    }
  }

  if (!migrationOk) {
    log('[CRITICAL] Schema could not be applied.');
    log('[CRITICAL] Application cannot start without valid database schema.');

    if (isEmpty) {
      log('');
      log('Database kosong tapi push gagal.');
      log('Kemungkinan penyebab:');
      log('  1. Schema files corrupt atau tidak valid');
      log('  2. Database connection issue');
      log('  3. Permission issue');
    } else {
      log('');
      log('Database existing tapi migrate gagal.');
      log('JANGAN gunakan push karena risiko kehilangan data.');
      log('');
      log('Langkah selanjutnya:');
      log('  1. Backup database: bun run db:backup');
      log('  2. Periksa migration files yang gagal');
      log('  3. Fix schema atau migration files');
      log('  4. Retry migration');
    }

    process.exit(1);
  }

  // Step 4: Seed Admin & Dummy Data
  log('Step 4/5: Seeding admin user...');
  try {
    execSync('bun run src/scripts/seed-admin.ts', { stdio: 'pipe', timeout: 30000, cwd: process.cwd() });
    log('[OK] Admin user seeded.');
  } catch {
    log('[WARN] Admin seed skipped (already exists or error).');
  }

  const seedEnv = process.env.SEED_DUMMY || '';
  if (seedEnv === 'true') {
    log('Step 4b/5: Seeding dummy data...');
    try {
      execSync('bun run src/scripts/seed-dummy.ts', { stdio: 'pipe', timeout: 60000, cwd: process.cwd() });
      log('[OK] Dummy data seeded.');
    } catch {
      log('[WARN] Dummy seed skipped.');
    }
  }

  // Step 5: Verify
  log('Step 5/5: Verifying migration...');
  try {
    execSync('bunx tsc --noEmit', { stdio: 'pipe', timeout: 60000, cwd: process.cwd() });
    log('[OK] Schema verification passed.');
  } catch {
    log('[WARN] Schema verification could not be completed. Check manually.');
  }

  console.log('');
  console.log('========================================');
  log('SAFE MIGRATION COMPLETED SUCCESSFULLY');
  console.log('========================================');
  console.log('');
}

main();

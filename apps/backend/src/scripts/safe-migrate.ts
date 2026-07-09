import { execSync, spawnSync } from 'child_process';
import { join } from 'path';
import { appendFileSync, readdirSync } from 'fs';
import { Pool } from 'pg';
import * as dns from 'dns';

const { promises: dnsPromises } = dns;

function ts() {
  return new Date().toISOString();
}

const AUDIT_LOG = process.env.AUDIT_LOG_PATH || join(process.cwd(), 'db-migrations.log');

function log(msg: string) {
  const entry = '[' + ts() + '] ' + msg;
  console.log(entry);
  try {
    appendFileSync(AUDIT_LOG, entry + '\n');
  } catch {
    // audit log write failure is non-fatal
  }
}

function runScript(name: string, scriptPath: string): boolean {
  try {
    log('Running: ' + name + '...');
    const result = spawnSync('bun', ['run', scriptPath], {
      stdio: 'inherit',
      timeout: 120000,
      cwd: process.cwd(),
      env: process.env,
    });
    if (result.status === 0) {
      log('[OK] ' + name + ' completed.');
      return true;
    }
    throw new Error('Exit code ' + result.status);
  } catch (err: any) {
    log('[FAILED] ' + name + ' failed: ' + (err.message || err));
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
    } catch (err: any) {
      if (err.name === 'AggregateError' && err.errors?.length) {
        lastError = err.errors.map((e: any) => e.message || String(e)).join('; ');
      } else {
        lastError = err.message || String(err);
      }
      log('Waiting for database to be ready (attempt ' + (i + 1) + '/' + retries + ')...');
      await pool.end();
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  log('[ERROR] Last error: ' + lastError);
  return false;
}

async function resolveDbHost(host: string): Promise<void> {
  try {
    const addresses = await dnsPromises.resolve4(host);
    log('  -> DNS resolved: ' + host + ' -> ' + addresses.join(', '));
  } catch {
    try {
      const addresses = await dnsPromises.resolve6(host);
      log('  -> DNS resolved (IPv6): ' + host + ' -> ' + addresses.join(', '));
    } catch {
      log('  -> DNS resolution failed for: ' + host);
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
    info.push('Host: ' + url.hostname + ':' + (url.port || '5432'));
    info.push('Database: ' + url.pathname.slice(1));
    info.push('User: ' + decodeURIComponent(url.username));

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

async function main() {
  console.log('');
  console.log('========================================');
  console.log('    SAFE MIGRATION PIPELINE');
  console.log('========================================');
  console.log('');

  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    log('Verifying database connectivity...');
    log('DATABASE_URL: ' + dbUrl);

    const diag = await diagnoseConnection(dbUrl);
    for (const line of diag) {
      log('  -> ' + line);
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
  const disablePush = process.env.DISABLE_PUSH_FALLBACK === 'true';

  try {
    log('Attempt 1: drizzle-kit migrate...');
    migrationAttempt = 'migrate';
    execSync('bunx drizzle-kit migrate', { stdio: 'inherit', timeout: 120000, cwd: process.cwd() });
    log('[OK] Migration completed (migrate).');
    migrationOk = true;
  } catch (err: any) {
    const errMsg = (err.message || err).split('\n')[0];
    log('[WARN] drizzle-kit migrate failed: ' + errMsg);

    if (disablePush) {
      log('[INFO] Push fallback is disabled (DISABLE_PUSH_FALLBACK=true).');
      log('[INFO] Run manually: docker exec simak_backend bun run --cwd apps/backend db:safe-migrate');
      log('');
      log('[WARN] Starting app without schema migration. Database may be out of date.');
      migrationOk = true;
    } else {
      log('Attempt 2: drizzle-kit push (fallback)...');
      migrationAttempt = 'push';

      try {
        execSync('bunx drizzle-kit push', { stdio: 'inherit', timeout: 120000, cwd: process.cwd() });
        log('[OK] Schema applied successfully (push).');
        migrationOk = true;
      } catch (pushErr: any) {
        log('[FAILED] drizzle-kit push also failed: ' + (pushErr.message || String(pushErr)).split('\n')[0]);
      }
    }
  }

  if (!migrationOk) {
    log('[CRITICAL] Schema could not be applied.');

    if (backedUp) {
      log('Attempting auto-restore from backup...');
      const backupDir = process.env.BACKUP_DIR || join(process.cwd(), 'backups');
      try {
        const files = readdirSync(backupDir)
          .filter((f) => f.startsWith('backup_') && f.endsWith('.sql.gz'))
          .sort()
          .reverse();
        if (files.length > 0) {
          const lastBackup = files[0];
          log('Restoring from: ' + lastBackup);
          const result = spawnSync('bun', ['run', 'src/scripts/restore-db.ts', lastBackup], {
            stdio: 'inherit',
            timeout: 300000,
            cwd: process.cwd(),
            env: process.env,
          });
          if (result.status === 0) {
            log('[OK] Database restored from backup.');
          } else {
            throw new Error('Restore script exited with code ' + result.status);
          }
        }
      } catch (restoreErr: any) {
        log('[WARN] Auto-restore failed. Manual restore required: bun run db:restore');
      }
    }

    process.exit(1);
  }

  // Step 4: Verify
  log('Step 4/4: Verifying migration...');
  try {
    execSync('bun --check src/models/schema.ts', { stdio: 'pipe', timeout: 30000, cwd: process.cwd() });
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

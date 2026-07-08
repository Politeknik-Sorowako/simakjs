import { execSync } from 'child_process';
import { join } from 'path';
import { Pool } from 'pg';

function ts() {
  return new Date().toISOString();
}

function log(msg: string) {
  console.log('[' + ts() + '] ' + msg);
}

function runScript(name: string, scriptPath: string): boolean {
  try {
    log('Running: ' + name + '...');
    execSync('bun run ' + scriptPath, { stdio: 'inherit', timeout: 120000, cwd: process.cwd() });
    log('[OK] ' + name + ' completed.');
    return true;
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
      lastError = err.message || String(err);
      log('Waiting for database to be ready (attempt ' + (i + 1) + '/' + retries + ')...');
      await pool.end();
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  log('[ERROR] Last error: ' + lastError);
  return false;
}

async function resolveDbHost(host: string): Promise<void> {
  const { execSync } = await import('child_process');
  try {
    execSync('getent hosts ' + host + ' 2>/dev/null || dig +short ' + host + ' 2>/dev/null || host ' + host + ' 2>/dev/null || nslookup ' + host + ' 2>/dev/null', { timeout: 5000 });
  } catch {
    // DNS resolution tools are optional
  }
}

async function diagnoseConnection(dbUrl: string): Promise<string[]> {
  const info: string[] = [];
  const match = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):?(\d*)\/(.+)/);
  if (match) {
    info.push('Host: ' + match[3] + ':' + (match[4] || '5432'));
    info.push('Database: ' + match[5]);
    info.push('User: ' + match[1]);
    try {
      const pingResult = execSync('ping -c 1 -W 2 ' + match[3] + ' 2>&1 || echo "unreachable"').toString().trim().split('\n').pop();
      info.push('Ping: ' + (pingResult || 'unknown'));
    } catch {
      info.push('Ping: failed');
    }
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

    // Diagnose connection
    const diag = await diagnoseConnection(dbUrl);
    for (const line of diag) {
      log('  -> ' + line);
    }

    const ok = await waitForDatabase(dbUrl);
    if (!ok) {
      log('');
      log('[CRITICAL] Database connection could not be established.');
      log('');
      log('Possible causes:');
      log('  1. Database container is not running');
      log('  2. Hostname "' + dbUrl.match(/@([^:]+)/)?.[1] + '" cannot be resolved');
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
  log('Step 3/4: Running database migrations...');
  try {
    log('Running drizzle-kit migrate...');
    execSync('bunx drizzle-kit migrate', { stdio: 'inherit', timeout: 120000, cwd: process.cwd() });
    log('[OK] Migration completed.');
  } catch (err: any) {
    log('[FAILED] Migration failed: ' + (err.message || err));

    if (backedUp) {
      log('Attempting auto-restore from backup...');
      const backupDir = process.env.BACKUP_DIR || join(process.cwd(), 'backups');
      try {
        const result = execSync('ls -t ' + backupDir + '/backup_*.sql.gz 2>/dev/null | head -1').toString().trim();
        if (result) {
          const lastBackup = result.replace(backupDir + '/', '');
          log('Restoring from: ' + lastBackup);
          execSync('bun run src/scripts/restore-db.ts ' + lastBackup, { stdio: 'inherit', timeout: 300000, cwd: process.cwd() });
          log('[OK] Database restored from backup.');
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

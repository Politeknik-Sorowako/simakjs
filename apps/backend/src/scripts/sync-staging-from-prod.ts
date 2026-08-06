import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import { appendFileSync, chmodSync, existsSync, mkdirSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

function ts(): string {
  return new Date().toISOString();
}

function resolveLogPath(): string {
  return process.env.AUDIT_LOG_PATH || join(process.cwd(), 'db-migrations.log');
}

function auditLog(msg: string): void {
  const entry = `[${ts()}] [STAGING_SYNC] ${msg}`;
  console.log(entry);
  try {
    appendFileSync(resolveLogPath(), `${entry}\n`);
  } catch {
    // Audit log write failure is non-fatal
  }
}

function expandTildePath(filePath: string): string {
  if (filePath.startsWith('~')) {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '/root';
    return filePath.replace(/^~(?=$|\/|\\)/, homeDir);
  }
  return filePath;
}

function getStagingDbConfig() {
  const urlStr = process.env.DATABASE_URL || '';
  if (!urlStr) {
    throw new Error('DATABASE_URL environment variable is required.');
  }
  const url = new URL(urlStr);
  return {
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    host: process.env.PGHOST || url.hostname || 'localhost',
    port: process.env.PGPORT || url.port || '5432',
    db: process.env.PGDATABASE || url.pathname.slice(1) || 'simak_staging',
  };
}

function validateEnv(isDryRun: boolean) {
  const requiredVars = ['DATABASE_URL'];
  if (!isDryRun) {
    requiredVars.push('PROD_SSH_HOST');
  }
  const missing = requiredVars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variable(s): ${missing.join(', ')}`);
  }
}

async function main() {
  auditLog('=== STARTING AUTOMATED STAGING DB SYNC ===');

  const isDryRun = process.argv.includes('--dry-run');
  if (isDryRun) {
    auditLog('Running in DRY-RUN mode. Actions will be logged but not executed on DB.');
  }

  validateEnv(isDryRun);

  const prodSshHost = process.env.PROD_SSH_HOST || '';
  const prodSshUser = process.env.PROD_SSH_USER || 'deploy';
  const prodSshPort = process.env.PROD_SSH_PORT || '22';
  const prodSshKeyRaw = process.env.PROD_SSH_KEY || '~/.ssh/id_rsa_staging_pull';
  const prodSshKey = expandTildePath(prodSshKeyRaw);
  const prodDbName = process.env.PROD_DB_NAME || 'simak_vokasi';
  const prodDbUser = process.env.PROD_DB_USER || 'simak_user';
  const prodDbContainer = process.env.PROD_DB_CONTAINER || 'simak_db';

  const randomId = crypto.randomBytes(8).toString('hex');
  const backupDir = join(process.cwd(), 'backups');
  const tempDumpPath = join(backupDir, `temp_prod_dump_${randomId}.sql`);
  const sanitizeSqlPath = join(__dirname, 'sanitize-staging.sql');

  const config = getStagingDbConfig();

  try {
    if (!existsSync(backupDir)) {
      mkdirSync(backupDir, { recursive: true, mode: 0o700 });
    }

    if (isDryRun) {
      auditLog(`[DRY-RUN] Key Path: ${prodSshKey}`);
      auditLog(
        `[DRY-RUN] Would fetch dump from ${prodSshUser}@${prodSshHost || 'PROD_HOST'}:${prodSshPort} -> ${tempDumpPath}`,
      );
      auditLog(`[DRY-RUN] Would restore dump into local DB: ${config.db} at ${config.host}:${config.port}`);
      auditLog(`[DRY-RUN] Would execute auto-migrations (safe-migrate)`);
      auditLog(`[DRY-RUN] Would execute sanitization script: ${sanitizeSqlPath}`);
      auditLog('[DRY-RUN] Staging DB Sync completed successfully (simulation).');
      return;
    }

    auditLog(`Fetching dump from Production (${prodSshHost}:${prodSshPort})...`);

    // 1. Pull dump from Prod using SSH & pg_dump (exec in Docker container if configured)
    const remoteDumpCmd =
      prodDbContainer && prodDbContainer !== 'none'
        ? `docker exec ${prodDbContainer} pg_dump -U ${prodDbUser} -d ${prodDbName} --clean --if-exists --no-owner --no-acl`
        : `pg_dump -U ${prodDbUser} -d ${prodDbName} --clean --if-exists --no-owner --no-acl`;

    const sshDumpCmd = `ssh -p ${prodSshPort} -i "${prodSshKey}" -o StrictHostKeyChecking=accept-new ${prodSshUser}@${prodSshHost} "${remoteDumpCmd}" > "${tempDumpPath}"`;

    const fetchResult = spawnSync('sh', ['-c', sshDumpCmd], {
      env: process.env,
      stdio: ['inherit', 'pipe', 'pipe'],
      timeout: 600000, // 10 minutes
    });

    if (fetchResult.error || fetchResult.status !== 0) {
      const stderr = fetchResult.stderr ? fetchResult.stderr.toString() : '';
      throw new Error(`Failed to fetch dump from Prod. Code: ${fetchResult.status}. Stderr: ${stderr}`);
    }

    // Set secure file mode 0o600
    try {
      chmodSync(tempDumpPath, 0o600);
    } catch {
      // Non-fatal if chmod not supported on OS
    }

    // Sanity check: verify file size (must be >= 10 KB)
    const fileStats = statSync(tempDumpPath);
    if (fileStats.size < 10240) {
      throw new Error(
        `Retrieved dump size is suspiciously small (${fileStats.size} bytes). Aborting restore to prevent corrupting Staging DB.`,
      );
    }

    auditLog(
      `Dump successfully retrieved (${(fileStats.size / 1024 / 1024).toFixed(2)} MB). Restoring into Staging DB...`,
    );

    // 2. Restore into Staging DB
    const restoreResult = spawnSync(
      'psql',
      ['-h', config.host, '-p', config.port, '-U', config.user, '-d', config.db, '-f', tempDumpPath],
      {
        env: { ...process.env, PGPASSWORD: config.password },
        stdio: ['inherit', 'pipe', 'pipe'],
        timeout: 600000,
      },
    );

    if (restoreResult.error || restoreResult.status !== 0) {
      const stderr = restoreResult.stderr ? restoreResult.stderr.toString() : '';
      throw new Error(`Failed to restore dump into Staging DB. Code: ${restoreResult.status}. Stderr: ${stderr}`);
    }

    auditLog('Restore completed. Running auto-migrations (safe-migrate)...');

    // 3. Apply Staging Migrations (Catch up DB schema if Prod lags behind Staging)
    const migrateResult = spawnSync('bun', ['run', 'src/scripts/safe-migrate.ts'], {
      env: process.env,
      stdio: ['inherit', 'pipe', 'pipe'],
      timeout: 120000,
    });

    if (migrateResult.error || migrateResult.status !== 0) {
      const stderr = migrateResult.stderr ? migrateResult.stderr.toString() : '';
      auditLog(`Warning: Auto-migration after restore encountered issue: ${stderr}`);
    } else {
      auditLog('Auto-migration (safe-migrate) executed successfully.');
    }

    auditLog('Running data sanitization script...');

    // 4. Run Data Sanitization SQL
    if (existsSync(sanitizeSqlPath)) {
      const sanitizeResult = spawnSync(
        'psql',
        ['-h', config.host, '-p', config.port, '-U', config.user, '-d', config.db, '-f', sanitizeSqlPath],
        {
          env: { ...process.env, PGPASSWORD: config.password },
          stdio: ['inherit', 'pipe', 'pipe'],
          timeout: 60000,
        },
      );

      if (sanitizeResult.error || sanitizeResult.status !== 0) {
        const stderr = sanitizeResult.stderr ? sanitizeResult.stderr.toString() : '';
        auditLog(`Warning: Data sanitization returned error: ${stderr}`);
      } else {
        auditLog('Data sanitization executed successfully.');
      }
    }

    auditLog('=== STAGING DB SYNC COMPLETED SUCCESSFULLY ===');
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    auditLog(`Sync failed: ${errorMsg}`);
    process.exit(1);
  } finally {
    if (existsSync(tempDumpPath)) {
      try {
        unlinkSync(tempDumpPath);
        auditLog('Temporary dump file cleaned up.');
      } catch {
        // Ignore cleanup failure
      }
    }
  }
}

main();

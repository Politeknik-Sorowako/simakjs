import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { db } from '../utils/db';

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

async function main() {
  auditLog('=== STARTING AUTOMATED STAGING DB SYNC ===');

  const isDryRun = process.argv.includes('--dry-run');
  if (isDryRun) {
    auditLog('Running in DRY-RUN mode. Actions will be logged but not executed on DB.');
  }

  const prodSshHost = process.env.PROD_SSH_HOST;
  const prodSshUser = process.env.PROD_SSH_USER || 'deploy';
  const prodSshKey = process.env.PROD_SSH_KEY || '~/.ssh/id_rsa_staging_pull';
  const prodDbName = process.env.PROD_DB_NAME || 'simak_vokasi';
  const prodDbUser = process.env.PROD_DB_USER || 'postgres';

  const tempDumpPath = join(process.cwd(), 'backups', `temp_prod_dump_${Date.now()}.sql`);
  const sanitizeSqlPath = join(__dirname, 'sanitize-staging.sql');

  const config = getStagingDbConfig();

  try {
    if (!existsSync(join(process.cwd(), 'backups'))) {
      mkdirSync(join(process.cwd(), 'backups'), { recursive: true, mode: 0o700 });
    }

    if (isDryRun) {
      auditLog(`[DRY-RUN] Would fetch dump from ${prodSshUser}@${prodSshHost || 'PROD_HOST'} -> ${tempDumpPath}`);
      auditLog(`[DRY-RUN] Would restore dump into local DB: ${config.db} at ${config.host}:${config.port}`);
      auditLog(`[DRY-RUN] Would execute sanitization script: ${sanitizeSqlPath}`);
      auditLog('[DRY-RUN] Staging DB Sync completed successfully (simulation).');
      return;
    }

    if (!prodSshHost) {
      throw new Error('PROD_SSH_HOST environment variable is missing.');
    }

    auditLog(`Fetching dump from Production (${prodSshHost})...`);

    // 1. Pull dump from Prod using SSH & pg_dump
    const sshDumpCmd = `ssh -i ${prodSshKey} -o StrictHostKeyChecking=accept-new ${prodSshUser}@${prodSshHost} "pg_dump -U ${prodDbUser} -d ${prodDbName} --clean --if-exists --no-owner --no-acl" > ${tempDumpPath}`;

    const fetchResult = spawnSync('sh', ['-c', sshDumpCmd], {
      env: process.env,
      stdio: ['inherit', 'pipe', 'pipe'],
      timeout: 600000, // 10 minutes
    });

    if (fetchResult.error || fetchResult.status !== 0) {
      const stderr = fetchResult.stderr ? fetchResult.stderr.toString() : '';
      throw new Error(`Failed to fetch dump from Prod. Code: ${fetchResult.status}. Stderr: ${stderr}`);
    }

    auditLog('Dump successfully retrieved. Restoring into Staging DB...');

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

    auditLog('Restore completed. Running data sanitization script...');

    // 3. Run Data Sanitization SQL
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

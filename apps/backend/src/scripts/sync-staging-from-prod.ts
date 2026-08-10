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

interface ExecResult {
  ok: boolean;
  stderr: string;
}

function sendTelegram(message: string): void {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const enabled = process.env.SYNC_TELEGRAM_ENABLED === 'true' && process.env.TELEGRAM_ENABLED !== 'false';
  if (!enabled || !token || !chatId) {
    auditLog('Telegram disabled or credentials missing; skipping notification.');
    return;
  }
  const safeMsg = message.replace(/(\r\n|\r|\n)/g, '%0A').replace(/[«»"]/g, '');
  const cmd = `curl -s --max-time 10 -X POST "https://api.telegram.org/bot${token}/sendMessage" -d chat_id=${chatId} -d parse_mode=Markdown -d "text=${safeMsg}"`;
  const result = spawnSync('sh', ['-c', cmd], { stdio: ['pipe', 'pipe', 'pipe'], timeout: 15000 });
  if (result.status === 0) {
    auditLog('Telegram notification sent.');
  } else {
    auditLog(`Failed to send Telegram notification: ${result.stderr?.toString() || 'unknown error'}`);
  }
}

function runCommand(cmd: string, timeoutMs: number, onError: (stderr: string) => never): ExecResult {
  const result = spawnSync('sh', ['-c', cmd], {
    env: process.env,
    stdio: ['inherit', 'pipe', 'pipe'],
    timeout: timeoutMs,
  });
  if (result.error || result.status !== 0) {
    const stderr = result.stderr ? result.stderr.toString() : result.error?.message || '';
    onError(stderr);
  }
  return { ok: result.status === 0, stderr: result.stderr ? result.stderr.toString() : '' };
}

async function main() {
  auditLog('=== STARTING AUTOMATED STAGING DB SYNC ===');

  const isDryRun = process.argv.includes('--dry-run');
  if (isDryRun) {
    auditLog('Running in DRY-RUN mode. Actions will be logged but not executed on DB.');
  }

  const localSync = (process.env.LOCAL_SYNC || 'true') === 'true';
  const stagingDbContainer = process.env.STAGING_DB_CONTAINER || 'simak_db_staging';
  const stagingBackendContainer = process.env.STAGING_BACKEND_CONTAINER || 'simak_backend_staging';
  const prodDbName = process.env.PROD_DB_NAME || 'simak_vokasi';
  const prodDbUser = process.env.PROD_DB_USER || 'simak_user';
  const prodDbContainer = process.env.PROD_DB_CONTAINER || 'simak_db';
  const prodSshHost = process.env.PROD_SSH_HOST || 'localhost';
  const prodSshUser = process.env.PROD_SSH_USER || 'deploy';
  const prodSshPort = process.env.PROD_SSH_PORT || '22';
  const prodSshKey = expandTildePath(process.env.PROD_SSH_KEY || '~/.ssh/id_rsa_staging_pull');
  const backendUrl = process.env.STAGING_BACKEND_URL || 'http://localhost:3001';

  if (!process.env.DATABASE_URL) {
    auditLog('Missing required environment variable: DATABASE_URL');
    throw new Error('Missing required environment variable: DATABASE_URL');
  }

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
      auditLog(`[DRY-RUN] Mode: ${localSync ? 'LOCAL (docker exec on same VPS)' : 'SSH'}`);
      auditLog(
        localSync
          ? `[DRY-RUN] Would dump production DB from container ${prodDbContainer} (db=${prodDbName}) -> ${tempDumpPath}`
          : `[DRY-RUN] Would fetch dump from ${prodSshUser}@${prodSshHost}:${prodSshPort} -> ${tempDumpPath}`,
      );
      auditLog(`[DRY-RUN] Would restore dump into staging DB ${config.db} via container ${stagingDbContainer}`);
      auditLog('[DRY-RUN] Would execute auto-migrations (safe-migrate)');
      auditLog(`[DRY-RUN] Would execute sanitization script: ${sanitizeSqlPath}`);
      auditLog('[DRY-RUN] Would verify: row counts, remaining PII, health check');
      auditLog('[DRY-RUN] Staging DB Sync completed successfully (simulation).');
      return;
    }

    // 1. Pull dump from Production
    const pgDumpBase = `pg_dump -U ${prodDbUser} -d ${prodDbName} --clean --if-exists --no-owner --no-acl`;
    if (localSync) {
      auditLog(`Dumping production DB from local container ${prodDbContainer}...`);
      const dumpCmd = `docker exec ${prodDbContainer} ${pgDumpBase} > "${tempDumpPath}"`;
      runCommand(dumpCmd, 600000, (stderr) => {
        throw new Error(`Failed to dump production DB (local). Stderr: ${stderr}`);
      });
    } else {
      auditLog(`Fetching dump from Production (${prodSshHost}:${prodSshPort})...`);
      const remoteDumpCmd =
        prodDbContainer && prodDbContainer !== 'none' ? `docker exec ${prodDbContainer} ${pgDumpBase}` : pgDumpBase;
      const sshDumpCmd = `ssh -p ${prodSshPort} -i "${prodSshKey}" -o StrictHostKeyChecking=accept-new ${prodSshUser}@${prodSshHost} "${remoteDumpCmd}" > "${tempDumpPath}"`;
      runCommand(sshDumpCmd, 600000, (stderr) => {
        throw new Error(`Failed to fetch dump from Prod. Stderr: ${stderr}`);
      });
    }

    // Secure file mode
    try {
      chmodSync(tempDumpPath, 0o600);
    } catch {
      // Non-fatal
    }

    // Sanity check
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
    if (stagingDbContainer && stagingDbContainer !== 'none') {
      runCommand(
        `docker exec -i ${stagingDbContainer} psql -U ${config.user} -d ${config.db} < "${tempDumpPath}"`,
        600000,
        (stderr) => {
          throw new Error(`Failed to restore dump into Staging DB. Stderr: ${stderr}`);
        },
      );
    } else {
      runCommand(
        `psql -h ${config.host} -p ${config.port} -U ${config.user} -d ${config.db} -f "${tempDumpPath}"`,
        600000,
        (stderr) => {
          throw new Error(`Failed to restore dump into Staging DB. Stderr: ${stderr}`);
        },
      );
    }
    auditLog('Restore completed.');

    // 3. Apply Staging Migrations
    //    Dijalankan di dalam container backend staging agar host `db_staging`
    //    (network Docker) dapat di-resolve, konsisten dengan deploy-staging.sh.
    auditLog('Running auto-migrations (safe-migrate) inside staging backend container...');
    const migrateCmd = `docker exec ${stagingBackendContainer} sh -c 'cd /app/apps/backend && bun run db:safe-migrate'`;
    const migrateResult = spawnSync('sh', ['-c', migrateCmd], {
      env: process.env,
      stdio: ['inherit', 'pipe', 'pipe'],
      timeout: 180000,
    });
    if (migrateResult.error || migrateResult.status !== 0) {
      const stderr = migrateResult.stderr
        ? migrateResult.stderr.toString()
        : migrateResult.error
          ? migrateResult.error.message
          : '';
      auditLog(`Warning: Auto-migration after restore encountered issue: ${stderr}`);
    } else {
      auditLog('Auto-migration (safe-migrate) executed successfully.');
    }

    // 4. Run Data Sanitization SQL
    auditLog('Running data sanitization script...');
    if (existsSync(sanitizeSqlPath)) {
      if (stagingDbContainer && stagingDbContainer !== 'none') {
        runCommand(
          `docker exec -i ${stagingDbContainer} psql -U ${config.user} -d ${config.db} < "${sanitizeSqlPath}"`,
          60000,
          (stderr) => {
            throw new Error(`Data sanitization failed. Stderr: ${stderr}`);
          },
        );
      } else {
        runCommand(
          `psql -h ${config.host} -p ${config.port} -U ${config.user} -d ${config.db} -f "${sanitizeSqlPath}"`,
          60000,
          (stderr) => {
            throw new Error(`Data sanitization failed. Stderr: ${stderr}`);
          },
        );
      }
      auditLog('Data sanitization executed successfully.');
    }

    // 5. Verification
    auditLog('Running post-sync verification...');
    const verifyPsqlCmd = (query: string) => {
      const q = query.replace(/"/g, '\\"');
      if (stagingDbContainer && stagingDbContainer !== 'none') {
        return `docker exec ${stagingDbContainer} psql -U ${config.user} -d ${config.db} -t -A -c "${q}"`;
      }
      return `PGPASSWORD=${config.password} psql -h ${config.host} -p ${config.port} -U ${config.user} -d ${config.db} -t -A -c "${q}"`;
    };

    const queryValue = (query: string, label: string): string => {
      const result = spawnSync('sh', ['-c', verifyPsqlCmd(query)], { stdio: ['pipe', 'pipe', 'pipe'], timeout: 30000 });
      const out = result.stdout ? result.stdout.toString().trim() : '';
      if (result.status !== 0) {
        auditLog(`Warning: verification query "${label}" failed: ${result.stderr?.toString().trim() || 'unknown'}`);
      }
      return out;
    };

    const usersCount = queryValue('SELECT COUNT(*) FROM users', 'users');
    const mahasiswaCount = queryValue('SELECT COUNT(*) FROM mahasiswa', 'mahasiswa');
    const dosenCount = queryValue('SELECT COUNT(*) FROM dosen', 'dosen');
    const matkulCount = queryValue('SELECT COUNT(*) FROM mata_kuliah', 'mata_kuliah');
    auditLog(
      `Row counts -> users: ${usersCount}, mahasiswa: ${mahasiswaCount}, dosen: ${dosenCount}, mata_kuliah: ${matkulCount}`,
    );

    const remainingEmails = queryValue(
      `SELECT COUNT(*) FROM (
        SELECT email FROM users WHERE email NOT LIKE '%@staging.simak.local'
        UNION ALL
        SELECT email FROM dosen WHERE email NOT LIKE '%@staging.simak.local'
        UNION ALL
        SELECT email FROM mahasiswa WHERE email NOT LIKE '%@staging.simak.local'
      ) AS remaining`,
      'remaining-asli-emails',
    );
    const remainingNikMhs = queryValue(
      `SELECT COUNT(*) FROM mahasiswa WHERE nik IS NOT NULL AND nik NOT LIKE '0%'`,
      'remaining-asli-nik-mahasiswa',
    );
    auditLog(`Remaining asli PII -> emails: ${remainingEmails}, mahasiswa nik: ${remainingNikMhs}`);

    const healthResult = spawnSync(
      'curl',
      ['-s', '-o', '/dev/null', '-w', '%{http_code}', `${backendUrl}/health`, '--connect-timeout', '5'],
      { stdio: ['pipe', 'pipe', 'pipe'], timeout: 15000 },
    );
    const httpCode = healthResult.stdout?.toString().trim() || '000';
    auditLog(`Staging backend health check -> HTTP ${httpCode}`);
    if (httpCode !== '200') {
      auditLog('Warning: staging backend did not return HTTP 200 on /health.');
    }

    auditLog('=== STAGING DB SYNC COMPLETED SUCCESSFULLY ===');
    sendTelegram(
      `✅ *Staging DB Sync Successful*
*Mode:* ${localSync ? 'Local (same VPS)' : 'SSH'}
*Rows:* users=${usersCount || '?'}, mahasiswa=${mahasiswaCount || '?'}, dosen=${dosenCount || '?'}
*Remaining PII:* emails=${remainingEmails || '?'}, nik=${remainingNikMhs || '?'}
*Health:* HTTP ${httpCode}
*Time:* ${new Date().toISOString()}`,
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    auditLog(`Sync failed: ${errorMsg}`);
    sendTelegram(`❌ *Staging DB Sync Failed*\n*Error:* ${errorMsg}\n*Time:* ${new Date().toISOString()}`);
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

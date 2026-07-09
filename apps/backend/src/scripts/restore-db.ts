import { spawnSync } from 'child_process';
import { existsSync, readdirSync, statSync, appendFileSync, writeFileSync, unlinkSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { gunzipSync } from 'zlib';
import * as readline from 'readline';

function getDbConfig() {
  const url = new URL(process.env.DATABASE_URL || '');
  if (!url.hostname) {
    throw new Error('Invalid DATABASE_URL format. Expected: postgresql://user:password@host:port/db');
  }
  return {
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    host: process.env.PGHOST || url.hostname || 'localhost',
    port: process.env.PGPORT || url.port || '5432',
    db: process.env.PGDATABASE || url.pathname.slice(1) || 'simak_vokasi',
  };
}

function resolveBackupDir(): string {
  const dir = process.env.BACKUP_DIR || join(process.cwd(), 'backups');
  return resolve(dir);
}

const AUDIT_LOG = process.env.AUDIT_LOG_PATH || join(resolveBackupDir(), '../db-migrations.log');

function auditLog(msg: string) {
  const entry = '[' + new Date().toISOString() + '] ' + msg;
  console.log(entry);
  try {
    appendFileSync(AUDIT_LOG, entry + '\n');
  } catch {
    // audit log write failure is non-fatal
  }
}

const BACKUP_FILE_PATTERN = /^backup_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.sql\.gz$/;

function isValidBackupFilename(name: string): boolean {
  return BACKUP_FILE_PATTERN.test(name);
}

function validateFilePath(backupDir: string, filename: string): string {
  if (!isValidBackupFilename(filename)) {
    auditLog('Invalid backup filename format: ' + filename);
    process.exit(1);
  }
  const filepath = resolve(backupDir, filename);
  const resolvedBackupDir = resolve(backupDir);
  if (!filepath.startsWith(resolvedBackupDir + '/') && filepath !== resolvedBackupDir + '/' + filename) {
    auditLog('Path traversal detected: ' + filename);
    process.exit(1);
  }
  return filepath;
}

function acquireLock(backupDir: string): boolean {
  const lockFile = join(backupDir, '.restore.lock');
  if (existsSync(lockFile)) {
    try {
      const pid = readFileSync(lockFile, 'utf-8').trim();
      auditLog('Another restore is in progress (PID: ' + pid + '). Please wait.');
    } catch {
      auditLog('Another restore is in progress. Please wait.');
    }
    return false;
  }
  writeFileSync(lockFile, process.pid.toString(), { mode: 0o600 });
  return true;
}

function releaseLock(backupDir: string) {
  try {
    unlinkSync(join(backupDir, '.restore.lock'));
  } catch {
    // lock file cleanup is best-effort
  }
}

function listBackups(backupDir: string): string[] {
  if (!existsSync(backupDir)) return [];
  return readdirSync(backupDir)
    .filter((f) => f.startsWith('backup_') && f.endsWith('.sql.gz'))
    .sort()
    .reverse();
}

async function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  const config = getDbConfig();
  const backupDir = resolveBackupDir();

  auditLog('=== DATABASE RESTORE ===');
  auditLog('Target: ' + config.db + ' @ ' + config.host + ':' + config.port);

  if (!acquireLock(backupDir)) {
    process.exit(1);
  }

  let selectedFile = process.argv[2];

  if (!selectedFile) {
    const backups = listBackups(backupDir);
    if (backups.length === 0) {
      console.error('[ERROR] No backup files found in', backupDir);
      console.error('Usage: bun run db:restore <filename>');
      console.error('   or: bun run db:restore (interactive)');
      releaseLock(backupDir);
      process.exit(1);
    }

    console.log('\nAvailable backups:');
    for (let i = 0; i < backups.length; i++) {
      const f = backups[i];
      try {
        const stats = statSync(join(backupDir, f));
        const size = (stats.size / 1024 / 1024).toFixed(1);
        console.log('  ' + (i + 1) + '. ' + f + ' (' + size + ' MB)');
      } catch {
        console.log('  ' + (i + 1) + '. ' + f + ' (unknown size)');
      }
    }

    const answer = await askQuestion('\nSelect backup number to restore (or "q" to quit): ');
    if (answer.toLowerCase() === 'q') {
      console.log('[CANCELLED] Restore cancelled by user.');
      releaseLock(backupDir);
      process.exit(0);
    }
    const idx = parseInt(answer) - 1;
    if (isNaN(idx) || idx < 0 || idx >= backups.length) {
      console.error('[ERROR] Invalid selection.');
      releaseLock(backupDir);
      process.exit(1);
    }
    selectedFile = backups[idx];
  }

  const filepath = validateFilePath(backupDir, selectedFile);

  if (!existsSync(filepath)) {
    auditLog('Backup file not found: ' + filepath);
    releaseLock(backupDir);
    process.exit(1);
  }

  const stats = statSync(filepath);
  const size = (stats.size / 1024 / 1024).toFixed(1);

  auditLog('Selected backup: ' + selectedFile + ' (' + size + ' MB)');
  auditLog('Database: ' + config.db + ' @ ' + config.host + ':' + config.port);

  const confirm = await askQuestion('WARNING: This will DESTROY all current data. Continue? (yes/no): ');
  if (confirm.toLowerCase() !== 'yes') {
    auditLog('Restore cancelled by user.');
    releaseLock(backupDir);
    process.exit(0);
  }

  auditLog('Restoring database...');

  try {
    const compressed = readFileSync(filepath);
    const decompressed = gunzipSync(compressed);

    const restoreProcess = spawnSync('psql', [
      '-h', config.host,
      '-p', config.port,
      '-U', config.user,
      '-d', config.db,
    ], {
      env: { ...process.env, PGPASSWORD: config.password },
      input: decompressed,
      stdio: ['pipe', 'inherit', 'inherit'],
      timeout: 600000,
    });

    if (restoreProcess.error) {
      throw new Error('psql spawn failed: ' + restoreProcess.error.message);
    }
    if (restoreProcess.status !== 0) {
      throw new Error('psql exited with code ' + restoreProcess.status);
    }

    auditLog('Database restored successfully from: ' + selectedFile);
  } catch (err: any) {
    auditLog('Restore failed: ' + (err.message || err));
    releaseLock(backupDir);
    process.exit(1);
  }

  releaseLock(backupDir);
}

main();

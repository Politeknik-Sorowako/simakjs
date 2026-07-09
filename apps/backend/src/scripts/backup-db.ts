import { spawnSync } from 'child_process';
import { existsSync, mkdirSync, readdirSync, unlinkSync, statSync, writeFileSync, appendFileSync } from 'fs';
import { join, resolve } from 'path';
import { gzipSync } from 'zlib';

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
  const resolved = resolve(dir);
  return resolved;
}

function ts() {
  return new Date().toISOString();
}

const AUDIT_LOG = process.env.AUDIT_LOG_PATH || join(resolveBackupDir(), '../db-migrations.log');

function auditLog(msg: string) {
  const entry = '[' + ts() + '] ' + msg;
  console.log(entry);
  try {
    appendFileSync(AUDIT_LOG, entry + '\n');
  } catch {
    // audit log write failure is non-fatal
  }
}

async function main() {
  auditLog('=== DATABASE BACKUP ===');
  auditLog('Starting backup...');

  const config = getDbConfig();
  const backupDir = resolveBackupDir();
  const retention = parseInt(process.env.BACKUP_RETENTION || '10', 10);

  if (!existsSync(backupDir)) {
    mkdirSync(backupDir, { recursive: true, mode: 0o700 });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = 'backup_' + timestamp + '.sql.gz';
  const filepath = join(backupDir, filename);

  try {
    const dumpProcess = spawnSync('pg_dump', [
      '-h', config.host,
      '-p', config.port,
      '-U', config.user,
      '-d', config.db,
      '--no-owner',
      '--no-acl',
    ], {
      env: { ...process.env, PGPASSWORD: config.password },
      stdio: ['inherit', 'pipe', 'inherit'],
      timeout: 300000,
    });

    if (dumpProcess.error) {
      throw new Error('pg_dump spawn failed: ' + dumpProcess.error.message);
    }
    if (dumpProcess.status !== 0) {
      throw new Error('pg_dump exited with code ' + dumpProcess.status);
    }

    const compressed = gzipSync(dumpProcess.stdout);
    writeFileSync(filepath, compressed, { mode: 0o600 });

    const stats = statSync(filepath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    auditLog('Backup saved: ' + filename + ' (' + sizeMB + ' MB)');

    const files = readdirSync(backupDir)
      .filter((f) => f.startsWith('backup_') && f.endsWith('.sql.gz'))
      .sort()
      .reverse();

    if (files.length > retention) {
      const toDelete = files.slice(retention);
      for (const f of toDelete) {
        unlinkSync(join(backupDir, f));
        auditLog('Deleted old backup: ' + f);
      }
    }

    auditLog('Backup completed successfully. Retention: ' + retention + ' backups');
  } catch (err: any) {
    auditLog('Backup failed: ' + (err.message || err));
    process.exit(1);
  }
}

main();

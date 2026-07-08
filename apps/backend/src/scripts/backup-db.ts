import { execSync } from 'child_process';
import { existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';

function getDbConfig() {
  const url = process.env.DATABASE_URL || '';
  const match = url.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):?(\d*)\/(.+)/);
  if (!match) {
    throw new Error('Invalid DATABASE_URL format. Expected: postgresql://user:password@host:port/db');
  }
  return {
    user: match[1],
    password: match[2],
    host: process.env.PGHOST || match[3] || 'localhost',
    port: process.env.PGPORT || match[4] || '5432',
    db: process.env.PGDATABASE || match[5] || 'simak_vokasi',
  };
}

function ts() {
  return new Date().toISOString();
}

async function main() {
  console.log('=== DATABASE BACKUP ===');
  console.log('[' + ts() + '] Starting backup...');

  const config = getDbConfig();
  const backupDir = process.env.BACKUP_DIR || join(process.cwd(), 'backups');
  const retention = parseInt(process.env.BACKUP_RETENTION || '10', 10);

  if (!existsSync(backupDir)) {
    mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = 'backup_' + timestamp + '.sql.gz';
  const filepath = join(backupDir, filename);

  try {
    const cmd = 'PGPASSWORD="' + config.password + '" pg_dump -h ' + config.host +
      ' -p ' + config.port + ' -U ' + config.user + ' -d ' + config.db +
      ' --no-owner --no-acl | gzip > "' + filepath + '"';
    execSync(cmd, { stdio: 'inherit', timeout: 300000 });

    const raw = execSync('wc -c < "' + filepath + '"').toString().trim();
    const sizeMB = (parseInt(raw) / 1024 / 1024).toFixed(2);
    console.log('[OK] Backup saved: ' + filename + ' (' + sizeMB + ' MB)');

    const files = readdirSync(backupDir)
      .filter((f) => f.startsWith('backup_') && f.endsWith('.sql.gz'))
      .sort()
      .reverse();

    if (files.length > retention) {
      const toDelete = files.slice(retention);
      for (const f of toDelete) {
        unlinkSync(join(backupDir, f));
        console.log('[CLEANUP] Deleted old backup: ' + f);
      }
    }

    console.log('[OK] Backup completed successfully. Retention: ' + retention + ' backups');
  } catch (err: any) {
    console.error('[FAILED] Backup failed: ' + (err.message || err));
    process.exit(1);
  }
}

main();

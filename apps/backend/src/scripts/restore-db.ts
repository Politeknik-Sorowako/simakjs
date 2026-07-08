import { execSync } from 'child_process';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import * as readline from 'readline';

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
  const backupDir = process.env.BACKUP_DIR || join(process.cwd(), 'backups');

  console.log('=== DATABASE RESTORE ===');
  console.log('Target:', config.db, '@', config.host + ':' + config.port);

  let selectedFile = process.argv[2];

  if (!selectedFile) {
    const backups = listBackups(backupDir);
    if (backups.length === 0) {
      console.error('[ERROR] No backup files found in', backupDir);
      console.error('Usage: bun run db:restore <filename>');
      console.error('   or: bun run db:restore (interactive)');
      process.exit(1);
    }

    console.log('\nAvailable backups:');
    for (let i = 0; i < backups.length; i++) {
      const f = backups[i];
      const raw = execSync('wc -c < "' + join(backupDir, f) + '"').toString().trim();
      const size = (parseInt(raw) / 1024 / 1024).toFixed(1);
      console.log('  ' + (i + 1) + '. ' + f + ' (' + size + ' MB)');
    }

    const answer = await askQuestion('\nSelect backup number to restore (or "q" to quit): ');
    if (answer.toLowerCase() === 'q') {
      console.log('[CANCELLED] Restore cancelled by user.');
      process.exit(0);
    }
    const idx = parseInt(answer) - 1;
    if (isNaN(idx) || idx < 0 || idx >= backups.length) {
      console.error('[ERROR] Invalid selection.');
      process.exit(1);
    }
    selectedFile = backups[idx];
  }

  const filepath = join(backupDir, selectedFile);
  if (!existsSync(filepath)) {
    console.error('[ERROR] Backup file not found:', filepath);
    process.exit(1);
  }

  const raw = execSync('wc -c < "' + filepath + '"').toString().trim();
  const size = (parseInt(raw) / 1024 / 1024).toFixed(1);

  console.log('\nSelected backup:', selectedFile, '(' + size + ' MB)');
  console.log('Database:', config.db, '@', config.host + ':' + config.port);

  const confirm = await askQuestion('WARNING: This will DESTROY all current data. Continue? (yes/no): ');
  if (confirm.toLowerCase() !== 'yes') {
    console.log('[CANCELLED] Restore cancelled by user.');
    process.exit(0);
  }

  console.log('\n[PROGRESS] Restoring database...');

  try {
    const cmd = 'PGPASSWORD="' + config.password + '" gunzip -c "' + filepath + '" | psql -h ' + config.host + ' -p ' + config.port + ' -U ' + config.user + ' -d ' + config.db;
    execSync(cmd, { stdio: 'inherit', timeout: 600000 });
    console.log('[OK] Database restored successfully from:', selectedFile);
  } catch (err: any) {
    console.error('[FAILED] Restore failed:', err.message || err);
    process.exit(1);
  }
}

main();

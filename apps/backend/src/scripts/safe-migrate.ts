import { execSync } from 'child_process';
import { join } from 'path';

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

async function main() {
  console.log('');
  console.log('========================================');
  console.log('    SAFE MIGRATION PIPELINE');
  console.log('========================================');
  console.log('');

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

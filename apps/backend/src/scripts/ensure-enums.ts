import { Pool } from 'pg';

interface EnumFix {
  name: string;
  value: string;
  before?: string;
}

const ENUM_FIXES: EnumFix[] = [
  { name: 'tagihan_status', value: 'cicilan', before: 'lunas' },
  { name: 'user_role', value: 'prodi', before: 'keuangan' },
  { name: 'user_role', value: 'keuangan', before: 'guest' },
  { name: 'user_role', value: 'guest' },
];

async function ensureEnums() {
  if (!process.env.DATABASE_URL) {
    console.error('[ENSURE ENUMS] DATABASE_URL is not set');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  console.log('[ENSURE ENUMS] Checking PostgreSQL enum values...');

  for (const fix of ENUM_FIXES) {
    const beforeClause = fix.before ? ` BEFORE '${fix.before}'` : '';
    const query = `ALTER TYPE ${fix.name} ADD VALUE IF NOT EXISTS '${fix.value}'${beforeClause}`;

    try {
      await pool.query(query);
      console.log(`[ENSURE ENUMS] Added/verified ${fix.name}.${fix.value}`);
    } catch (e: any) {
      if (e.code === '42710' || e.message?.includes('already exists')) {
        console.log(`[ENSURE ENUMS] ${fix.name}.${fix.value} already exists — no action needed.`);
      } else {
        console.warn(`[ENSURE ENUMS] Non-critical error for ${fix.name}.${fix.value}:`, e.message);
      }
    }
  }

  await pool.end();
  console.log('[ENSURE ENUMS] Done.');
  process.exit(0);
}

ensureEnums().catch((err) => {
  console.error('[ENSURE ENUMS] Failed:', err);
  process.exit(1);
});

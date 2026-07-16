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
  { name: 'user_role', value: 'calon_mahasiswa', before: 'guest' },
];

async function ensureEnums() {
  if (!process.env.DATABASE_URL) {
    console.error('[ENSURE ENUMS] DATABASE_URL is not set');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  console.log('[ENSURE ENUMS] Checking PostgreSQL enum values...');

  for (const fix of ENUM_FIXES) {
    // Check if the type exists first
    const typeCheck = await pool.query(
      `SELECT 1 FROM pg_type WHERE typname = $1`,
      [fix.name]
    );
    
    if (typeCheck.rows.length === 0) {
      console.log(`[ENSURE ENUMS] Type ${fix.name} does not exist yet — skipping.`);
      continue;
    }

    const { rows } = await pool.query(
      `SELECT enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = $1`,
      [fix.name],
    );
    const exists = rows.some((r: any) => r.enumlabel === fix.value);

    if (exists) {
      console.log(`[ENSURE ENUMS] ${fix.name}.${fix.value} already exists — no action needed.`);
      continue;
    }

    const beforeClause = fix.before ? ` BEFORE '${fix.before}'` : '';
    await pool.query(`ALTER TYPE ${fix.name} ADD VALUE '${fix.value}'${beforeClause}`);
    console.log(`[ENSURE ENUMS] Added ${fix.name}.${fix.value}`);
  }

  await pool.end();
  console.log('[ENSURE ENUMS] Done.');
  process.exit(0);
}

ensureEnums().catch((err) => {
  console.error('[ENSURE ENUMS] Failed:', err);
  process.exit(1);
});

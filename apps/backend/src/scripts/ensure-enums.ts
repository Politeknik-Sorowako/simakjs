import { Pool } from 'pg';

interface EnumFix {
  name: string;
  value: string;
  before?: string;
}

const ENUM_FIXES: EnumFix[] = [
  { name: 'tagihan_status', value: 'cicilan', before: 'lunas' },
  { name: 'user_role', value: 'super_admin', before: 'admin' },
  { name: 'user_role', value: 'prodi', before: 'keuangan' },
  { name: 'user_role', value: 'keuangan', before: 'guest' },
  { name: 'user_role', value: 'guest' },
  { name: 'user_role', value: 'calon_mahasiswa', before: 'guest' },
  { name: 'presensi_status', value: 'terlambat' },
  { name: 'presensi_status', value: 'unknown' },
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
    const typeCheck = await pool.query(`SELECT 1 FROM pg_type WHERE typname = $1`, [fix.name]);

    if (typeCheck.rows.length === 0) {
      console.log(`[ENSURE ENUMS] Type ${fix.name} does not exist yet — skipping.`);
      continue;
    }

    const { rows } = await pool.query(
      `SELECT enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = $1`,
      [fix.name],
    );
    const exists = rows.some((r: Record<string, unknown>) => r.enumlabel === fix.value);

    if (exists) {
      console.log(`[ENSURE ENUMS] ${fix.name}.${fix.value} already exists — no action needed.`);
      continue;
    }

    const beforeClause = fix.before ? ` BEFORE '${fix.before}'` : '';
    await pool.query(`ALTER TYPE ${fix.name} ADD VALUE IF NOT EXISTS '${fix.value}'${beforeClause}`);
    console.log(`[ENSURE ENUMS] Added ${fix.name}.${fix.value}`);
  }

  // Ensure critical schema elements exist (idempotent self-healing)
  try {
    await pool.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "must_change_password" boolean DEFAULT false NOT NULL;`,
    );
    await pool.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "prodi_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;`);
    console.log('[ENSURE ENUMS] Checked users columns (must_change_password, prodi_ids).');
  } catch (colErr: unknown) {
    console.log(`[ENSURE ENUMS] Column check skipped: ${(colErr as Error).message || String(colErr)}`);
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
        "user_id" integer,
        "user_role" varchar(50),
        "ip_address" varchar(45),
        "user_agent" text,
        "action_type" varchar(20) NOT NULL,
        "module" varchar(50) NOT NULL,
        "entity_id" varchar(100),
        "description" text NOT NULL,
        "metadata" jsonb
      );
    `);
    console.log('[ENSURE ENUMS] Checked audit_logs table.');
  } catch (tblErr: unknown) {
    console.log(`[ENSURE ENUMS] Table check skipped: ${(tblErr as Error).message || String(tblErr)}`);
  }

  await pool.end();
  console.log('[ENSURE ENUMS] Done.');
  process.exit(0);
}

ensureEnums().catch((err) => {
  console.error('[ENSURE ENUMS] Failed:', err);
  process.exit(1);
});

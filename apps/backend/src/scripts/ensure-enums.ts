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

  // NOTE: Schema changes are primarily managed by Drizzle SQL migrations.
  // The queries below serve as an idempotent self-healing safety fallback for production runtime environments (e.g. Docker startup).
  try {
    await pool.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "must_change_password" boolean DEFAULT false NOT NULL;`,
    );
    await pool.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "prodi_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;`);
    await pool.query(`ALTER TABLE "sesi_apel" ADD COLUMN IF NOT EXISTS "catatan" text;`);
    await pool.query(`ALTER TABLE "presensi_apel" ADD COLUMN IF NOT EXISTS "keterangan" text;`);
    await pool.query(`UPDATE "program_studi" SET "is_synced" = false WHERE "is_synced" IS NULL;`);
    await pool.query(`UPDATE "mahasiswa" SET "is_synced" = false WHERE "is_synced" IS NULL;`);
    await pool.query(`UPDATE "users" SET "must_change_password" = false WHERE "must_change_password" IS NULL;`);
    console.log('[ENSURE ENUMS] Checked columns and normalized legacy null values.');
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
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "title" varchar(255) NOT NULL,
        "message" text NOT NULL,
        "is_read" boolean DEFAULT false NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS "idx_notifications_user_id" ON "notifications" ("user_id");`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS "kelompok_apel" (
        "id" serial PRIMARY KEY NOT NULL,
        "nama_kelompok" varchar(100) NOT NULL,
        "dosen_id" integer REFERENCES "dosen"("id") ON DELETE RESTRICT,
        "shift" varchar(10) DEFAULT 'pagi' NOT NULL,
        "keterangan" text,
        "is_active" boolean DEFAULT true NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "kelompok_apel_anggota" (
        "id" serial PRIMARY KEY NOT NULL,
        "kelompok_apel_id" integer NOT NULL REFERENCES "kelompok_apel"("id") ON DELETE CASCADE,
        "mahasiswa_id" integer NOT NULL REFERENCES "mahasiswa"("id") ON DELETE CASCADE,
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "sesi_apel" (
        "id" serial PRIMARY KEY NOT NULL,
        "kelompok_apel_id" integer NOT NULL REFERENCES "kelompok_apel"("id") ON DELETE CASCADE,
        "tanggal" date NOT NULL,
        "shift" varchar(10) NOT NULL,
        "dosen_id" integer NOT NULL REFERENCES "dosen"("id") ON DELETE RESTRICT,
        "jam_mulai" time NOT NULL,
        "catatan" text,
        "is_closed" boolean DEFAULT false NOT NULL,
        "closed_at" timestamp,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "presensi_apel" (
        "id" serial PRIMARY KEY NOT NULL,
        "sesi_apel_id" integer NOT NULL REFERENCES "sesi_apel"("id") ON DELETE CASCADE,
        "mahasiswa_id" integer NOT NULL REFERENCES "mahasiswa"("id") ON DELETE CASCADE,
        "status" presensi_status DEFAULT 'hadir' NOT NULL,
        "menit_terlambat" integer,
        "keterangan" text,
        "verified_status" presensi_status,
        "verified_by" integer REFERENCES "users"("id") ON DELETE SET NULL,
        "verified_at" timestamp,
        "verification_note" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    console.log('[ENSURE ENUMS] Checked audit_logs, notifications, and apel tables.');
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

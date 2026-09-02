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
  { name: 'user_role', value: 'kaprodi', before: 'prodi' },
  { name: 'user_role', value: 'plp' },
  { name: 'user_role', value: 'instruktur', before: 'guest' },
  { name: 'user_role', value: 'guest' },
  { name: 'user_role', value: 'calon_mahasiswa', before: 'guest' },
  { name: 'presensi_status', value: 'terlambat' },
  { name: 'presensi_status', value: 'unknown' },
  { name: 'ketidakhadiran_sumber', value: 'BAP' },
  { name: 'ketidakhadiran_sumber', value: 'APEL' },
  { name: 'ketidakhadiran_sumber', value: 'MANUAL' },
  { name: 'ketidakhadiran_sumber', value: 'PRAKTIKUM' },
  { name: 'ketidakhadiran_status', value: 'UNKNOWN' },
  { name: 'ketidakhadiran_status', value: 'SAKIT' },
  { name: 'ketidakhadiran_status', value: 'IZIN' },
  { name: 'ketidakhadiran_status', value: 'ALPA' },
  { name: 'ketidakhadiran_status', value: 'TERLAMBAT' },
  { name: 'ketidakhadiran_status', value: 'RUSAK' },
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
    await pool
      .query(
        `DELETE FROM "dosen_pengajar_kelas" WHERE "dosen_id" IS NOT NULL AND "dosen_id" NOT IN (SELECT "id" FROM "dosen");`,
      )
      .catch(() => {});
    await pool.query(`ALTER TABLE "bap" ALTER COLUMN "cpmk_id" DROP NOT NULL;`).catch(() => {});
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "bap_topik" (
        "id" serial PRIMARY KEY NOT NULL,
        "bap_id" integer NOT NULL REFERENCES "bap"("id") ON DELETE CASCADE,
        "topik_id" integer REFERENCES "rps_topik"("id") ON DELETE CASCADE,
        "cpmk_id" integer REFERENCES "cpmk"("id") ON DELETE CASCADE,
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "rombel_praktikum" (
        "id" serial PRIMARY KEY NOT NULL,
        "kelas_kuliah_id" integer NOT NULL REFERENCES "kelas_kuliah"("id") ON DELETE CASCADE,
        "nama_group" varchar(255) NOT NULL,
        "instruktur_id" integer REFERENCES "dosen"("id") ON DELETE SET NULL,
        "keterangan" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
      CREATE TABLE IF NOT EXISTS "rombel_praktikum_mahasiswa" (
        "id" serial PRIMARY KEY NOT NULL,
        "rombel_praktikum_id" integer NOT NULL REFERENCES "rombel_praktikum"("id") ON DELETE CASCADE,
        "mahasiswa_id" integer NOT NULL REFERENCES "mahasiswa"("id") ON DELETE CASCADE,
        "created_at" timestamp DEFAULT now() NOT NULL
      );
      CREATE TABLE IF NOT EXISTS "bap_praktikum" (
        "id" serial PRIMARY KEY NOT NULL,
        "rombel_praktikum_id" integer NOT NULL REFERENCES "rombel_praktikum"("id") ON DELETE CASCADE,
        "tanggal" date NOT NULL,
        "sesi_ke" integer DEFAULT 1 NOT NULL,
        "materi" text NOT NULL,
        "catatan" text,
        "durasi_menit" integer DEFAULT 100 NOT NULL,
        "instruktur_id" integer REFERENCES "dosen"("id") ON DELETE SET NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
      CREATE TABLE IF NOT EXISTS "presensi_praktikum" (
        "id" serial PRIMARY KEY NOT NULL,
        "bap_praktikum_id" integer NOT NULL REFERENCES "bap_praktikum"("id") ON DELETE CASCADE,
        "mahasiswa_id" integer NOT NULL REFERENCES "mahasiswa"("id") ON DELETE CASCADE,
        "status" presensi_status NOT NULL,
        "durasi_mangkir" integer DEFAULT 0 NOT NULL,
        "keterangan" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
      ALTER TABLE "rombel_praktikum" ADD COLUMN IF NOT EXISTS "instruktur_id" integer REFERENCES "dosen"("id") ON DELETE SET NULL;
      ALTER TABLE "bap_praktikum" ADD COLUMN IF NOT EXISTS "instruktur_id" integer REFERENCES "dosen"("id") ON DELETE SET NULL;
    `);
    await pool.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "must_change_password" boolean DEFAULT false NOT NULL;`,
    );
    await pool.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "prodi_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;`);
    await pool.query(`ALTER TABLE "sesi_apel" ADD COLUMN IF NOT EXISTS "catatan" text;`);
    await pool.query(`ALTER TABLE "presensi_apel" ADD COLUMN IF NOT EXISTS "keterangan" text;`);
    // Normalize legacy null values for production data compatibility
    // Prevents 422 Unprocessable Entity response validation errors on existing database rows
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
        "link" text,
        "is_read" boolean DEFAULT false NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    await pool.query(`ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "link" text;`);
    await pool.query(`ALTER TABLE "bimbingan" ADD COLUMN IF NOT EXISTS "topik_bimbingan" text;`);
    await pool.query(`ALTER TABLE "bimbingan" ADD COLUMN IF NOT EXISTS "kategori" varchar(20) DEFAULT 'PA' NOT NULL;`);
    await pool.query(
      `ALTER TABLE "bimbingan" ADD COLUMN IF NOT EXISTS "is_read_by_mahasiswa" boolean DEFAULT false NOT NULL;`,
    );
    await pool.query(`ALTER TABLE "bimbingan" ADD COLUMN IF NOT EXISTS "read_at_mahasiswa" timestamp;`);
    await pool.query(
      `ALTER TABLE "bimbingan_thread" ADD COLUMN IF NOT EXISTS "is_read_by_mahasiswa" boolean DEFAULT false NOT NULL;`,
    );
    await pool.query(`ALTER TABLE "bimbingan_thread" ADD COLUMN IF NOT EXISTS "read_at_mahasiswa" timestamp;`);
    await pool.query(`ALTER TABLE "sesi_bimbingan" ADD COLUMN IF NOT EXISTS "topik_bimbingan" text;`);
    await pool.query(`ALTER TABLE "sesi_bimbingan" ALTER COLUMN "permasalahan" DROP NOT NULL;`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "bimbingan_attachments" (
        "id" serial PRIMARY KEY NOT NULL,
        "bimbingan_id" integer NOT NULL REFERENCES "bimbingan"("id") ON DELETE CASCADE,
        "bimbingan_thread_id" integer REFERENCES "bimbingan_thread"("id") ON DELETE CASCADE,
        "file_url" text NOT NULL,
        "file_name" varchar(255) NOT NULL,
        "file_size" integer NOT NULL,
        "file_type" varchar(100) NOT NULL,
        "uploaded_by" integer REFERENCES "users"("id") ON DELETE SET NULL,
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

  try {
    const sumberType = await pool.query(`SELECT 1 FROM pg_type WHERE typname = 'ketidakhadiran_sumber'`);
    if (sumberType.rows.length === 0) {
      await pool.query(`CREATE TYPE "ketidakhadiran_sumber" AS ENUM ('BAP', 'APEL', 'MANUAL');`);
    }
    const statusType = await pool.query(`SELECT 1 FROM pg_type WHERE typname = 'ketidakhadiran_status'`);
    if (statusType.rows.length === 0) {
      await pool.query(
        `CREATE TYPE "ketidakhadiran_status" AS ENUM ('UNKNOWN', 'SAKIT', 'IZIN', 'ALPA', 'TERLAMBAT', 'RUSAK');`,
      );
    }
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "ketidakhadiran_mahasiswa" (
        "id" serial PRIMARY KEY NOT NULL,
        "mahasiswa_id" integer NOT NULL REFERENCES "mahasiswa"("id") ON DELETE CASCADE,
        "tanggal" date NOT NULL,
        "sumber" ketidakhadiran_sumber NOT NULL,
        "sumber_id" integer,
        "status" ketidakhadiran_status NOT NULL,
        "durasi_menit" integer DEFAULT 0 NOT NULL,
        "keterangan" text,
        "is_verified" boolean DEFAULT false NOT NULL,
        "verified_by" integer REFERENCES "users"("id") ON DELETE SET NULL,
        "verified_at" timestamp,
        "created_by" integer REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    await pool.query(
      `ALTER TABLE "ketidakhadiran_mahasiswa" ADD COLUMN IF NOT EXISTS "durasi_menit" integer DEFAULT 0 NOT NULL;`,
    );
    await pool.query(`ALTER TABLE "ketidakhadiran_mahasiswa" ADD COLUMN IF NOT EXISTS "keterangan" text;`);
    await pool.query(
      `ALTER TABLE "ketidakhadiran_mahasiswa" ADD COLUMN IF NOT EXISTS "is_verified" boolean DEFAULT false NOT NULL;`,
    );
    await pool.query(`ALTER TABLE "ketidakhadiran_mahasiswa" ADD COLUMN IF NOT EXISTS "verified_by" integer;`);
    await pool.query(`ALTER TABLE "ketidakhadiran_mahasiswa" ADD COLUMN IF NOT EXISTS "verified_at" timestamp;`);
    await pool.query(`ALTER TABLE "ketidakhadiran_mahasiswa" ADD COLUMN IF NOT EXISTS "created_by" integer;`);
    await pool.query(
      `ALTER TABLE "ketidakhadiran_mahasiswa" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;`,
    );
    await pool.query(
      `ALTER TABLE "ketidakhadiran_mahasiswa" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;`,
    );
    await pool.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "idx_ketidakhadiran_sumber" ON "ketidakhadiran_mahasiswa" ("sumber", "sumber_id");`,
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS "idx_ketidakhadiran_mhs_tgl" ON "ketidakhadiran_mahasiswa" ("mahasiswa_id", "tanggal");`,
    );
    console.log('[ENSURE ENUMS] Checked ketidakhadiran_mahasiswa table.');
  } catch (keErr: unknown) {
    console.log(`[ENSURE ENUMS] ketidakhadiran table check skipped: ${(keErr as Error).message || String(keErr)}`);
  }

  await pool.end();
  console.log('[ENSURE ENUMS] Done.');
  process.exit(0);
}

ensureEnums().catch((err) => {
  console.error('[ENSURE ENUMS] Failed:', err);
  process.exit(1);
});

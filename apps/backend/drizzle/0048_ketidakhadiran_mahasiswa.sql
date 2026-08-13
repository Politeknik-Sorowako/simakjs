-- Fitur: Tabel terpusat ketidakhadiran mahasiswa (single source of truth) untuk rekap kompensasi.
-- Menggabungkan data ketidakhadiran dari presensi BAP, presensi_apel, dan kompensasi_manual.
-- All statements are idempotent / guarded so they are safe to run repeatedly.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ketidakhadiran_sumber') THEN
    CREATE TYPE "ketidakhadiran_sumber" AS ENUM ('BAP', 'APEL', 'MANUAL');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ketidakhadiran_status') THEN
    CREATE TYPE "ketidakhadiran_status" AS ENUM ('UNKNOWN', 'SAKIT', 'IZIN', 'ALPA', 'TERLAMBAT', 'RUSAK');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ketidakhadiran_mahasiswa" (
  "id" serial PRIMARY KEY NOT NULL,
  "mahasiswa_id" integer NOT NULL,
  "tanggal" date NOT NULL,
  "sumber" "ketidakhadiran_sumber" NOT NULL,
  "sumber_id" integer,
  "status" "ketidakhadiran_status" NOT NULL,
  "durasi_menit" integer NOT NULL DEFAULT 0,
  "keterangan" text,
  "is_verified" boolean NOT NULL DEFAULT false,
  "verified_by" integer,
  "verified_at" timestamp,
  "created_by" integer,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_ketidakhadiran_sumber" ON "ketidakhadiran_mahasiswa" ("sumber", "sumber_id");
CREATE INDEX IF NOT EXISTS "idx_ketidakhadiran_mhs_tgl" ON "ketidakhadiran_mahasiswa" ("mahasiswa_id", "tanggal");

-- Backfill historical data (idempotent).
INSERT INTO "ketidakhadiran_mahasiswa"
  ("mahasiswa_id", "tanggal", "sumber", "sumber_id", "status", "durasi_menit", "keterangan", "is_verified", "verified_by", "verified_at", "created_by", "created_at", "updated_at")
SELECT
  p."mahasiswa_id",
  b."tanggal",
  'BAP',
  p."id",
  CASE WHEN p."status"::text = 'telat' THEN 'TERLAMBAT' ELSE UPPER(p."status"::text) END,
  p."durasi_mangkir",
  p."keterangan_admin",
  (p."resolved_at" IS NOT NULL),
  p."resolved_by",
  p."resolved_at",
  p."resolved_by",
  p."created_at",
  p."updated_at"
FROM "presensi" p
JOIN "bap" b ON b."id" = p."bap_id"
WHERE p."status" <> 'hadir'
  AND NOT EXISTS (SELECT 1 FROM "ketidakhadiran_mahasiswa" k WHERE k."sumber" = 'BAP' AND k."sumber_id" = p."id");

INSERT INTO "ketidakhadiran_mahasiswa"
  ("mahasiswa_id", "tanggal", "sumber", "sumber_id", "status", "durasi_menit", "keterangan", "is_verified", "verified_by", "verified_at", "created_by", "created_at", "updated_at")
SELECT
  pa."mahasiswa_id",
  sa."tanggal",
  'APEL',
  pa."id",
  CASE WHEN COALESCE(pa."verified_status"::text, pa."status"::text) = 'telat' THEN 'TERLAMBAT' ELSE UPPER(COALESCE(pa."verified_status"::text, pa."status"::text)) END,
  COALESCE(pa."menit_terlambat", 0),
  pa."verification_note",
  (pa."verified_at" IS NOT NULL),
  pa."verified_by",
  pa."verified_at",
  pa."verified_by",
  pa."created_at",
  pa."updated_at"
FROM "presensi_apel" pa
JOIN "sesi_apel" sa ON sa."id" = pa."sesi_apel_id"
WHERE pa."status" <> 'hadir'
  AND NOT EXISTS (SELECT 1 FROM "ketidakhadiran_mahasiswa" k WHERE k."sumber" = 'APEL' AND k."sumber_id" = pa."id");

INSERT INTO "ketidakhadiran_mahasiswa"
  ("mahasiswa_id", "tanggal", "sumber", "sumber_id", "status", "durasi_menit", "keterangan", "is_verified", "verified_by", "verified_at", "created_by", "created_at", "updated_at")
SELECT
  km."mahasiswa_id",
  km."tanggal",
  'MANUAL',
  km."id",
  CASE WHEN km."jenis_kompen" = 'telat' THEN 'TERLAMBAT' ELSE UPPER(km."jenis_kompen") END,
  km."durasi_menit",
  km."keterangan",
  true,
  NULL,
  NULL,
  km."created_by",
  km."created_at",
  km."updated_at"
FROM "kompensasi_manual" km
WHERE km."jenis_kompen" <> 'unknown'
  AND NOT EXISTS (SELECT 1 FROM "ketidakhadiran_mahasiswa" k WHERE k."sumber" = 'MANUAL' AND k."sumber_id" = km."id");
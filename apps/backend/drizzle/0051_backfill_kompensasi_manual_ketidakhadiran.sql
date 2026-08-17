-- Fitur: Backfill data kompensasi_manual yang belum ter-sync ke tabel terpusat
-- ketidakhadiran_mahasiswa (single source of truth untuk rekap kompensasi).
-- Data CSV import sebelum perbaikan hanya masuk ke kompensasi_manual tanpa
-- sync ke ketidakhadiran_mahasiswa sehingga tidak terhitung di Rekap Kompensasi.
-- Skrip ini idempotent dan aman dijalankan berulang.

-- Pastikan enum/type tersedia (aman jika sudah ada).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ketidakhadiran_sumber') THEN
    CREATE TYPE "ketidakhadiran_sumber" AS ENUM ('BAP', 'APEL', 'MANUAL');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ketidakhadiran_status') THEN
    CREATE TYPE "ketidakhadiran_status" AS ENUM ('UNKNOWN', 'SAKIT', 'IZIN', 'ALPA', 'TERLAMBAT', 'RUSAK');
  END IF;
END $$;

-- Pastikan tabel target ada.
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

-- Backfill data lama: kompensasi_manual yang belum memiliki baris sinkron
-- di ketidakhadiran_mahasiswa. Hanya jenis yang valid & bukan 'unknown'.
INSERT INTO "ketidakhadiran_mahasiswa"
  ("mahasiswa_id", "tanggal", "sumber", "sumber_id", "status", "durasi_menit", "keterangan", "is_verified", "created_by", "created_at", "updated_at")
SELECT
  km."mahasiswa_id",
  km."tanggal",
  'MANUAL',
  km."id",
  (CASE WHEN km."jenis_kompen" = 'telat' THEN 'TERLAMBAT' ELSE UPPER(km."jenis_kompen") END)::ketidakhadiran_status,
  km."durasi_menit",
  km."keterangan",
  true,
  km."created_by",
  km."created_at",
  km."updated_at"
FROM "kompensasi_manual" km
WHERE km."jenis_kompen" <> 'unknown'
  AND NOT EXISTS (SELECT 1 FROM "ketidakhadiran_mahasiswa" k WHERE k."sumber" = 'MANUAL' AND k."sumber_id" = km."id");

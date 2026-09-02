-- Fitur: Self-healing DDL idempotent untuk tabel ketidakhadiran_mahasiswa.
-- Memastikan seluruh kolom tabel selalu ada di database produksi/staging yang
-- dibuat dari versi sebelumnya, agar query update Drizzle (verifikasi unknown)
-- tidak gagal karena kolom tidak ditemukan. Statement aman dijalankan berulang kali.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'ketidakhadiran_sumber' AND e.enumlabel = 'PRAKTIKUM'
  ) THEN
    ALTER TYPE "ketidakhadiran_sumber" ADD VALUE 'PRAKTIKUM';
  END IF;
END $$;

ALTER TABLE "ketidakhadiran_mahasiswa" ADD COLUMN IF NOT EXISTS "durasi_menit" integer DEFAULT 0 NOT NULL;
ALTER TABLE "ketidakhadiran_mahasiswa" ADD COLUMN IF NOT EXISTS "keterangan" text;
ALTER TABLE "ketidakhadiran_mahasiswa" ADD COLUMN IF NOT EXISTS "is_verified" boolean DEFAULT false NOT NULL;
ALTER TABLE "ketidakhadiran_mahasiswa" ADD COLUMN IF NOT EXISTS "verified_by" integer;
ALTER TABLE "ketidakhadiran_mahasiswa" ADD COLUMN IF NOT EXISTS "verified_at" timestamp;
ALTER TABLE "ketidakhadiran_mahasiswa" ADD COLUMN IF NOT EXISTS "created_by" integer;
ALTER TABLE "ketidakhadiran_mahasiswa" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;
ALTER TABLE "ketidakhadiran_mahasiswa" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "idx_ketidakhadiran_sumber" ON "ketidakhadiran_mahasiswa" ("sumber", "sumber_id");
CREATE INDEX IF NOT EXISTS "idx_ketidakhadiran_mhs_tgl" ON "ketidakhadiran_mahasiswa" ("mahasiswa_id", "tanggal");
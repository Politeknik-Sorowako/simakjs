-- Fitur: Menambahkan kolom pelapor pada catatan pelanggaran mahasiswa
-- All statements are idempotent / guarded so they are safe to run repeatedly.

ALTER TABLE "pelanggaran" ADD COLUMN IF NOT EXISTS "pelapor" varchar(255);

-- Fitur: Manajemen status Program Studi (aktif, tidak_aktif, persiapan).
-- Data prodi yang sudah ada otomatis berstatus 'aktif'.
-- Idempoten: aman dijalankan berulang.

ALTER TABLE "program_studi" ADD COLUMN IF NOT EXISTS "status" varchar(20) NOT NULL DEFAULT 'aktif';

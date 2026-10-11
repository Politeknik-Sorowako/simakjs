-- Migrasi penambahan kolom thumbnail_url pada tabel pengumuman
-- Idempoten: aman dijalankan berulang.

ALTER TABLE "pengumuman" ADD COLUMN IF NOT EXISTS "thumbnail_url" varchar(500);

-- Fitur: Ekstensi data Program Studi (Kode PDDIKTI, SK Izin Operasional, SK Akreditasi).
-- Idempoten: aman dijalankan berulang.

ALTER TABLE "program_studi" ADD COLUMN IF NOT EXISTS "kode_prodi_pddikti" varchar(50);
ALTER TABLE "program_studi" ADD COLUMN IF NOT EXISTS "nomor_sk_izin_operasional" varchar(100);
ALTER TABLE "program_studi" ADD COLUMN IF NOT EXISTS "tanggal_sk_izin_operasional" date;
ALTER TABLE "program_studi" ADD COLUMN IF NOT EXISTS "tanggal_sk_izin_operasional_berlaku_mulai" date;
ALTER TABLE "program_studi" ADD COLUMN IF NOT EXISTS "file_sk_izin_operasional" text;
ALTER TABLE "program_studi" ADD COLUMN IF NOT EXISTS "nilai_akreditasi" varchar(50);
ALTER TABLE "program_studi" ADD COLUMN IF NOT EXISTS "tanggal_sk_akreditasi" date;
ALTER TABLE "program_studi" ADD COLUMN IF NOT EXISTS "tanggal_sk_akreditasi_berlaku_mulai" date;
ALTER TABLE "program_studi" ADD COLUMN IF NOT EXISTS "file_sk_akreditasi" text;

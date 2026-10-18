-- Fitur: Pemisahan nama asli dan gelar akademik dosen ([gelar_depan] [nama] [gelar_belakang]).
-- Menambahkan kolom gelar_depan dan gelar_belakang secara idempoten.

ALTER TABLE "dosen" ADD COLUMN IF NOT EXISTS "gelar_depan" varchar(50);
ALTER TABLE "dosen" ADD COLUMN IF NOT EXISTS "gelar_belakang" varchar(100);

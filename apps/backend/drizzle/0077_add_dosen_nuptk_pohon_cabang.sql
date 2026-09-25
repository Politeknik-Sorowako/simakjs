-- Fitur: Field dosen NUPTK, Pohon Ilmu, dan Cabang Ilmu.
-- NUPTK opsional + unik (fallback identitas BKD bila NIDN kosong),
-- Pohon Ilmu & Cabang Ilmu berupa teks bebas.
-- Idempoten: aman dijalankan berulang.

ALTER TABLE "dosen" ADD COLUMN IF NOT EXISTS "nuptk" varchar(20);
ALTER TABLE "dosen" ADD COLUMN IF NOT EXISTS "pohon_ilmu" varchar(255);
ALTER TABLE "dosen" ADD COLUMN IF NOT EXISTS "cabang_ilmu" varchar(255);

CREATE UNIQUE INDEX IF NOT EXISTS "dosen_nuptk_unique" ON "dosen" ("nuptk");
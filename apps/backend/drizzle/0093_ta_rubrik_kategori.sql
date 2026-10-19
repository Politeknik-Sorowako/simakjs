-- 0093_ta_rubrik_kategori.sql
-- Tambah kolom kategori pada tugas_akhir_rubrik_kriteria untuk pengelompokan A (pembimbingan), B (alat/mesin), C (laporan)
-- Idempoten: aman dijalankan berulang.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tugas_akhir_rubrik_kriteria' AND column_name = 'kategori'
  ) THEN
    ALTER TABLE "tugas_akhir_rubrik_kriteria"
    ADD COLUMN "kategori" varchar(30) DEFAULT 'umum' NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_ta_rubrik_kategori" ON "tugas_akhir_rubrik_kriteria" ("kategori");

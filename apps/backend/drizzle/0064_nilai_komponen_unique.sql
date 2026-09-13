-- Idempotent Migration: unique constraint (krs_id, komponen_nilai_id) pada nilai_komponen_mahasiswa
-- Backfill: hapus duplikat lama (keep id terbesar) lalu pasang unique index agar idempoten.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'nilai_komponen_mahasiswa'
  ) THEN
    DELETE FROM "nilai_komponen_mahasiswa" a
    USING "nilai_komponen_mahasiswa" b
    WHERE a.id < b.id
      AND a.krs_id = b.krs_id
      AND a.komponen_nilai_id = b.komponen_nilai_id;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "nilai_komponen_mahasiswa_krs_id_idx" ON "nilai_komponen_mahasiswa" ("krs_id");
CREATE UNIQUE INDEX IF NOT EXISTS "nilai_komponen_mahasiswa_krs_komponen_unique" ON "nilai_komponen_mahasiswa" ("krs_id", "komponen_nilai_id");

-- Fitur: Master Pasal Pelanggaran (BPA) + kolom pasal/sanksi pada pelanggaran.
-- All statements are idempotent / guarded so they are safe to run repeatedly.

-- Master table pasal pelanggaran sesuai BPA
CREATE TABLE IF NOT EXISTS "pasal_pelanggaran" (
  "id" serial PRIMARY KEY NOT NULL,
  "nomor_pasal" varchar(50) NOT NULL,
  "bunyi_pasal" text NOT NULL,
  "bobot_poin" integer DEFAULT 5 NOT NULL,
  "jenis_sanksi" integer DEFAULT 1 NOT NULL,
  "program_studi_id" integer,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'pasal_pelanggaran_program_studi_id_program_studi_id_fk'
  ) THEN
    ALTER TABLE "pasal_pelanggaran"
    ADD CONSTRAINT "pasal_pelanggaran_program_studi_id_program_studi_id_fk"
    FOREIGN KEY ("program_studi_id") REFERENCES "public"."program_studi"("id")
    ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_pasal_pelanggaran_prodi" ON "pasal_pelanggaran" ("program_studi_id");

-- Kolom pasal & jenis sanksi pada pelanggaran
ALTER TABLE "pelanggaran" ADD COLUMN IF NOT EXISTS "pasal_id" integer;
ALTER TABLE "pelanggaran" ADD COLUMN IF NOT EXISTS "jenis_sanksi" integer DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'pelanggaran_pasal_id_pasal_pelanggaran_id_fk'
  ) THEN
    ALTER TABLE "pelanggaran"
    ADD CONSTRAINT "pelanggaran_pasal_id_pasal_pelanggaran_id_fk"
    FOREIGN KEY ("pasal_id") REFERENCES "public"."pasal_pelanggaran"("id")
    ON DELETE set null ON UPDATE no action;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_pelanggaran_pasal_id" ON "pelanggaran" ("pasal_id");

-- Seed data awal pasal sesuai BPA umum (global, tanpa prodi)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "pasal_pelanggaran" WHERE "nomor_pasal" = 'Pasal 1') THEN
    INSERT INTO "pasal_pelanggaran" ("nomor_pasal", "bunyi_pasal", "bobot_poin", "jenis_sanksi") VALUES
      ('Pasal 1', 'Berpakaian tidak rapi / tidak sopan selama kegiatan akademik.', 5, 1),
      ('Pasal 2', 'Terlambat masuk kelas / kegiatan praktikum tanpa alasan sah.', 5, 1),
      ('Pasal 3', 'Meninggalkan kelas / kegiatan tanpa izin dosen.', 10, 1),
      ('Pasal 4', 'Merusak fasilitas / sarana kampus.', 15, 4),
      ('Pasal 5', 'Melawan / tidak menghormati dosen atau tenaga kependidikan.', 20, 4),
      ('Pasal 6', 'Melakukan kecurangan akademik (menyontek / plagiarisme).', 25, 4),
      ('Pasal 7', 'Melakukan tindakan asusila / pelecehan di lingkungan kampus.', 50, 4),
      ('Pasal 8', 'Terlibat penyalahgunaan narkoba / zat terlarang di lingkungan kampus.', 75, 4);
  END IF;
END $$;

-- Corrective idempotent migration.
-- Ensures the kategori_bimbingan table, system_settings table, and the
-- kategori_id columns on bimbingan / sesi_bimbingan exist even if an earlier
-- migration was silently skipped by the safe-migrate reconcile logic.
-- All statements are idempotent / guarded so they are safe to run repeatedly.

CREATE TABLE IF NOT EXISTS "kategori_bimbingan" (
	"id" serial PRIMARY KEY NOT NULL,
	"nama" varchar(100) NOT NULL,
	CONSTRAINT "kategori_bimbingan_nama_unique" UNIQUE ("nama"),
	"deskripsi" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "system_settings" (
	"key" varchar(100) PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "bimbingan" ADD COLUMN IF NOT EXISTS "kategori_id" integer;

ALTER TABLE "sesi_bimbingan" ADD COLUMN IF NOT EXISTS "kategori_id" integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'bimbingan_kategori_id_kategori_bimbingan_id_fk'
  ) THEN
    ALTER TABLE "bimbingan"
    ADD CONSTRAINT "bimbingan_kategori_id_kategori_bimbingan_id_fk"
    FOREIGN KEY ("kategori_id") REFERENCES "public"."kategori_bimbingan"("id")
    ON DELETE set null ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'sesi_bimbingan_kategori_id_kategori_bimbingan_id_fk'
  ) THEN
    ALTER TABLE "sesi_bimbingan"
    ADD CONSTRAINT "sesi_bimbingan_kategori_id_kategori_bimbingan_id_fk"
    FOREIGN KEY ("kategori_id") REFERENCES "public"."kategori_bimbingan"("id")
    ON DELETE set null ON UPDATE no action;
  END IF;
END $$;

INSERT INTO "kategori_bimbingan" ("nama", "deskripsi")
SELECT 'Bimbingan PA / Akademik', 'Pembimbingan akademik dan perwalian mahasiswa oleh Dosen Pembimbing Akademik'
WHERE NOT EXISTS (SELECT 1 FROM "kategori_bimbingan" WHERE "nama" = 'Bimbingan PA / Akademik');

INSERT INTO "kategori_bimbingan" ("nama", "deskripsi")
SELECT 'Tugas Akhir / Skripsi', 'Pembimbingan penulisan Tugas Akhir atau Skripsi'
WHERE NOT EXISTS (SELECT 1 FROM "kategori_bimbingan" WHERE "nama" = 'Tugas Akhir / Skripsi');

INSERT INTO "kategori_bimbingan" ("nama", "deskripsi")
SELECT 'Asistensi & Praktikum', 'Pembimbingan asistensi perkuliahan atau laboratorium'
WHERE NOT EXISTS (SELECT 1 FROM "kategori_bimbingan" WHERE "nama" = 'Asistensi & Praktikum');

INSERT INTO "system_settings" ("key", "value", "description")
VALUES ('feature_feedback_enabled', 'true', 'Pengaktifan modul evaluasi & feedback sistem')
ON CONFLICT ("key") DO NOTHING;
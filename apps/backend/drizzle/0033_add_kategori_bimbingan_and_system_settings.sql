CREATE TABLE IF NOT EXISTS "kategori_bimbingan" (
	"id" serial PRIMARY KEY NOT NULL,
	"nama" varchar(100) NOT NULL,
	"deskripsi" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "bimbingan" ADD COLUMN IF NOT EXISTS "kategori_id" integer;

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

CREATE TABLE IF NOT EXISTS "system_settings" (
	"key" varchar(100) PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Seed default categories if empty
INSERT INTO "kategori_bimbingan" ("nama", "deskripsi") 
SELECT 'Bimbingan PA / Akademik', 'Pembimbingan akademik dan perwalian mahasiswa oleh Dosen Pembimbing Akademik'
WHERE NOT EXISTS (SELECT 1 FROM "kategori_bimbingan" WHERE "nama" = 'Bimbingan PA / Akademik');

INSERT INTO "kategori_bimbingan" ("nama", "deskripsi") 
SELECT 'Tugas Akhir / Skripsi', 'Pembimbingan penulisan Tugas Akhir atau Skripsi'
WHERE NOT EXISTS (SELECT 1 FROM "kategori_bimbingan" WHERE "nama" = 'Tugas Akhir / Skripsi');

INSERT INTO "kategori_bimbingan" ("nama", "deskripsi") 
SELECT 'Asistensi & Praktikum', 'Pembimbingan asistensi perkuliahan atau laboratorium'
WHERE NOT EXISTS (SELECT 1 FROM "kategori_bimbingan" WHERE "nama" = 'Asistensi & Praktikum');

-- Seed default feature toggle
INSERT INTO "system_settings" ("key", "value", "description")
VALUES ('feature_feedback_enabled', 'true', 'Pengaktifan modul evaluasi & feedback sistem')
ON CONFLICT ("key") DO NOTHING;

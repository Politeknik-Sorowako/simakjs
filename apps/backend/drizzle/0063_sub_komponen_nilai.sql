-- Idempotent Migration: Flexible sub-grade components (breakdown level-2)
-- Menambahkan dukungan pemecahan komponen nilai menjadi sub-komponen dengan bobot masing-masing.
CREATE TABLE IF NOT EXISTS "sub_komponen_nilai" (
  "id" serial PRIMARY KEY NOT NULL,
  "komponen_nilai_id" integer NOT NULL REFERENCES "komponen_nilai"("id") ON DELETE CASCADE,
  "nama" varchar(100) NOT NULL,
  "bobot" integer NOT NULL,
  "urutan" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "sub_komponen_nilai_komponen_id_idx" ON "sub_komponen_nilai" ("komponen_nilai_id");

CREATE TABLE IF NOT EXISTS "nilai_sub_komponen_mahasiswa" (
  "id" serial PRIMARY KEY NOT NULL,
  "krs_id" integer NOT NULL REFERENCES "krs"("id") ON DELETE CASCADE,
  "sub_komponen_nilai_id" integer NOT NULL REFERENCES "sub_komponen_nilai"("id") ON DELETE CASCADE,
  "nilai" numeric(5, 2) NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "nilai_sub_komponen_mahasiswa_krs_id_idx" ON "nilai_sub_komponen_mahasiswa" ("krs_id");
CREATE INDEX IF NOT EXISTS "nilai_sub_komponen_mahasiswa_sub_id_idx" ON "nilai_sub_komponen_mahasiswa" ("sub_komponen_nilai_id");
CREATE UNIQUE INDEX IF NOT EXISTS "nilai_sub_komponen_mahasiswa_krs_sub_unique" ON "nilai_sub_komponen_mahasiswa" ("krs_id", "sub_komponen_nilai_id");

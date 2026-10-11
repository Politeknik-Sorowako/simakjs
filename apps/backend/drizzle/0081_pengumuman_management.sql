-- Migrasi Pengelolaan Pengumuman Akademik & Sistem
-- Mencakup enum dan tabel pengumuman, targeting (prodi, kelas, rombel), lampiran, dan status dibaca.
-- Idempoten: aman dijalankan berulang.

DO $$ BEGIN
  CREATE TYPE "pengumuman_status" AS ENUM ('draft', 'scheduled', 'published', 'withdrawn', 'archived');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "pengumuman_target_role" AS ENUM ('semua', 'mahasiswa', 'dosen', 'admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "pengumuman_target_prodi_type" AS ENUM ('semua', 'spesifik');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "pengumuman_target_scope_type" AS ENUM ('umum', 'kelas', 'rombel');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "pengumuman_lampiran_type" AS ENUM ('file', 'gambar', 'link');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "pengumuman" (
  "id" serial PRIMARY KEY NOT NULL,
  "judul" varchar(255) NOT NULL,
  "konten" text DEFAULT '' NOT NULL,
  "ringkasan" varchar(500),
  "author_id" integer NOT NULL,
  "author_role" varchar(50) NOT NULL,
  "status" "pengumuman_status" DEFAULT 'draft' NOT NULL,
  "target_role" "pengumuman_target_role" DEFAULT 'semua' NOT NULL,
  "target_prodi_type" "pengumuman_target_prodi_type" DEFAULT 'semua' NOT NULL,
  "target_scope_type" "pengumuman_target_scope_type" DEFAULT 'umum' NOT NULL,
  "is_pinned" boolean DEFAULT false NOT NULL,
  "published_at" timestamp,
  "withdrawn_at" timestamp,
  "withdrawn_reason" text,
  "expires_at" timestamp,
  "last_autosaved_at" timestamp,
  "view_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pengumuman_author_id_users_id_fk'
  ) THEN
    ALTER TABLE "pengumuman"
      ADD CONSTRAINT "pengumuman_author_id_users_id_fk"
      FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE restrict;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_pengumuman_status_published"
  ON "pengumuman" ("status", "published_at");
CREATE INDEX IF NOT EXISTS "idx_pengumuman_target_role"
  ON "pengumuman" ("target_role");
CREATE INDEX IF NOT EXISTS "idx_pengumuman_author"
  ON "pengumuman" ("author_id");

CREATE TABLE IF NOT EXISTS "pengumuman_target_prodi" (
  "id" serial PRIMARY KEY NOT NULL,
  "pengumuman_id" integer NOT NULL,
  "program_studi_id" integer NOT NULL
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pengumuman_target_prodi_pengumuman_id_fk'
  ) THEN
    ALTER TABLE "pengumuman_target_prodi"
      ADD CONSTRAINT "pengumuman_target_prodi_pengumuman_id_fk"
      FOREIGN KEY ("pengumuman_id") REFERENCES "pengumuman"("id") ON DELETE cascade;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pengumuman_target_prodi_program_studi_id_fk'
  ) THEN
    ALTER TABLE "pengumuman_target_prodi"
      ADD CONSTRAINT "pengumuman_target_prodi_program_studi_id_fk"
      FOREIGN KEY ("program_studi_id") REFERENCES "program_studi"("id") ON DELETE cascade;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_pengumuman_target_prodi_pair"
  ON "pengumuman_target_prodi" ("pengumuman_id", "program_studi_id");

CREATE TABLE IF NOT EXISTS "pengumuman_target_kelas" (
  "id" serial PRIMARY KEY NOT NULL,
  "pengumuman_id" integer NOT NULL,
  "kelas_kuliah_id" integer NOT NULL
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pengumuman_target_kelas_pengumuman_id_fk'
  ) THEN
    ALTER TABLE "pengumuman_target_kelas"
      ADD CONSTRAINT "pengumuman_target_kelas_pengumuman_id_fk"
      FOREIGN KEY ("pengumuman_id") REFERENCES "pengumuman"("id") ON DELETE cascade;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pengumuman_target_kelas_kelas_kuliah_id_fk'
  ) THEN
    ALTER TABLE "pengumuman_target_kelas"
      ADD CONSTRAINT "pengumuman_target_kelas_kelas_kuliah_id_fk"
      FOREIGN KEY ("kelas_kuliah_id") REFERENCES "kelas_kuliah"("id") ON DELETE cascade;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_pengumuman_target_kelas_pair"
  ON "pengumuman_target_kelas" ("pengumuman_id", "kelas_kuliah_id");

CREATE TABLE IF NOT EXISTS "pengumuman_target_rombel" (
  "id" serial PRIMARY KEY NOT NULL,
  "pengumuman_id" integer NOT NULL,
  "rombel_praktikum_id" integer NOT NULL
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pengumuman_target_rombel_pengumuman_id_fk'
  ) THEN
    ALTER TABLE "pengumuman_target_rombel"
      ADD CONSTRAINT "pengumuman_target_rombel_pengumuman_id_fk"
      FOREIGN KEY ("pengumuman_id") REFERENCES "pengumuman"("id") ON DELETE cascade;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pengumuman_target_rombel_rombel_praktikum_id_fk'
  ) THEN
    ALTER TABLE "pengumuman_target_rombel"
      ADD CONSTRAINT "pengumuman_target_rombel_rombel_praktikum_id_fk"
      FOREIGN KEY ("rombel_praktikum_id") REFERENCES "rombel_praktikum"("id") ON DELETE cascade;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_pengumuman_target_rombel_pair"
  ON "pengumuman_target_rombel" ("pengumuman_id", "rombel_praktikum_id");

CREATE TABLE IF NOT EXISTS "pengumuman_lampiran" (
  "id" serial PRIMARY KEY NOT NULL,
  "pengumuman_id" integer NOT NULL,
  "tipe" "pengumuman_lampiran_type" NOT NULL,
  "nama" varchar(255) NOT NULL,
  "url" text NOT NULL,
  "ukuran" integer,
  "mime_type" varchar(100),
  "created_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pengumuman_lampiran_pengumuman_id_fk'
  ) THEN
    ALTER TABLE "pengumuman_lampiran"
      ADD CONSTRAINT "pengumuman_lampiran_pengumuman_id_fk"
      FOREIGN KEY ("pengumuman_id") REFERENCES "pengumuman"("id") ON DELETE cascade;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_pengumuman_lampiran_pengumuman_id"
  ON "pengumuman_lampiran" ("pengumuman_id");

CREATE TABLE IF NOT EXISTS "pengumuman_dibaca" (
  "id" serial PRIMARY KEY NOT NULL,
  "pengumuman_id" integer NOT NULL,
  "user_id" integer NOT NULL,
  "read_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pengumuman_dibaca_pengumuman_id_fk'
  ) THEN
    ALTER TABLE "pengumuman_dibaca"
      ADD CONSTRAINT "pengumuman_dibaca_pengumuman_id_fk"
      FOREIGN KEY ("pengumuman_id") REFERENCES "pengumuman"("id") ON DELETE cascade;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pengumuman_dibaca_user_id_fk'
  ) THEN
    ALTER TABLE "pengumuman_dibaca"
      ADD CONSTRAINT "pengumuman_dibaca_user_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pengumuman_dibaca_user_unique'
  ) THEN
    ALTER TABLE "pengumuman_dibaca"
      ADD CONSTRAINT "pengumuman_dibaca_user_unique"
      UNIQUE ("pengumuman_id", "user_id");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_pengumuman_dibaca_user"
  ON "pengumuman_dibaca" ("user_id", "pengumuman_id");

-- SKPI: master kategori kegiatan, rekaman pencapaian kegiatan mahasiswa,
-- dan lampiran bukti sertifikat. Idempoten: aman dijalankan berulang.

-- Extend user_role enum with kemahasiswaan (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    BEGIN
      ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'kemahasiswaan';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "kategori_kegiatan_skpi" (
  "id" serial PRIMARY KEY NOT NULL,
  "nama" varchar(100) NOT NULL,
  "jenis" varchar(20) DEFAULT 'lainnya' NOT NULL,
  "poin_default" integer DEFAULT 0 NOT NULL,
  "is_aktif" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "kategori_kegiatan_skpi_nama_unique" UNIQUE ("nama")
);

CREATE TABLE IF NOT EXISTS "kegiatan_mahasiswa_skpi" (
  "id" serial PRIMARY KEY NOT NULL,
  "mahasiswa_id" integer NOT NULL,
  "kategori_kegiatan_id" integer NOT NULL,
  "nama_kegiatan" varchar(255) NOT NULL,
  "penyelenggara" varchar(255),
  "tanggal_mulai" date NOT NULL,
  "tanggal_selesai" date,
  "lokasi" varchar(255),
  "deskripsi" text,
  "nomor_sertifikat" varchar(100),
  "poin" integer DEFAULT 0 NOT NULL,
  "status" varchar(20) DEFAULT 'pending' NOT NULL,
  "catatan_verifikator" text,
  "verified_by_id" integer,
  "verified_at" timestamp,
  "created_by_id" integer NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "lampiran_kegiatan_skpi" (
  "id" serial PRIMARY KEY NOT NULL,
  "kegiatan_id" integer NOT NULL,
  "file_name" varchar(255) NOT NULL,
  "storage_key" varchar(255) NOT NULL,
  "mime_type" varchar(100) NOT NULL,
  "file_size" integer NOT NULL,
  "keterangan" varchar(255),
  "uploaded_by_id" integer,
  "created_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'kegiatan_mahasiswa_skpi_mahasiswa_id_fk') THEN
    ALTER TABLE "kegiatan_mahasiswa_skpi"
      ADD CONSTRAINT "kegiatan_mahasiswa_skpi_mahasiswa_id_fk" FOREIGN KEY ("mahasiswa_id")
      REFERENCES "mahasiswa"("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'kegiatan_mahasiswa_skpi_kategori_kegiatan_id_fk') THEN
    ALTER TABLE "kegiatan_mahasiswa_skpi"
      ADD CONSTRAINT "kegiatan_mahasiswa_skpi_kategori_kegiatan_id_fk" FOREIGN KEY ("kategori_kegiatan_id")
      REFERENCES "kategori_kegiatan_skpi"("id") ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'kegiatan_mahasiswa_skpi_verified_by_id_fk') THEN
    ALTER TABLE "kegiatan_mahasiswa_skpi"
      ADD CONSTRAINT "kegiatan_mahasiswa_skpi_verified_by_id_fk" FOREIGN KEY ("verified_by_id")
      REFERENCES "users"("id") ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'kegiatan_mahasiswa_skpi_created_by_id_fk') THEN
    ALTER TABLE "kegiatan_mahasiswa_skpi"
      ADD CONSTRAINT "kegiatan_mahasiswa_skpi_created_by_id_fk" FOREIGN KEY ("created_by_id")
      REFERENCES "users"("id") ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lampiran_kegiatan_skpi_kegiatan_id_fk') THEN
    ALTER TABLE "lampiran_kegiatan_skpi"
      ADD CONSTRAINT "lampiran_kegiatan_skpi_kegiatan_id_fk" FOREIGN KEY ("kegiatan_id")
      REFERENCES "kegiatan_mahasiswa_skpi"("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lampiran_kegiatan_skpi_uploaded_by_id_fk') THEN
    ALTER TABLE "lampiran_kegiatan_skpi"
      ADD CONSTRAINT "lampiran_kegiatan_skpi_uploaded_by_id_fk" FOREIGN KEY ("uploaded_by_id")
      REFERENCES "users"("id") ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_skpi_kegiatan_mahasiswa_status" ON "kegiatan_mahasiswa_skpi" ("mahasiswa_id", "status");
CREATE INDEX IF NOT EXISTS "idx_skpi_kegiatan_status" ON "kegiatan_mahasiswa_skpi" ("status");
CREATE INDEX IF NOT EXISTS "idx_skpi_lampiran_kegiatan" ON "lampiran_kegiatan_skpi" ("kegiatan_id");

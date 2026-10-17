-- Modul Aktivitas MBKM (Magang & Kuliah Kerja Praktik).
-- Mirror model data Neo Feeder `aktivitas_mahasiswa` beserta turunannya:
-- anggota (peserta), pembimbing, dan konversi (rekognisi SKS ke mata kuliah).
-- MBKM adalah entitas kegiatan pada Feeder — bukan atribut mata kuliah.
--
-- Selain itu: baris `bimbingan` yang dibuat otomatis oleh modul ini (kategori
-- MAGANG) diberi tautan `aktivitas_mbkm_id` agar sumbernya jelas dan tidak
-- dobel dengan bimbingan yang dicatat manual.
--
-- Idempoten: aman dijalankan berulang.

CREATE TABLE IF NOT EXISTS "jenis_aktivitas_mbkm" (
  "id" serial PRIMARY KEY NOT NULL,
  "nama" varchar(100) NOT NULL,
  "kode" varchar(50),
  "id_jenis_aktivitas_feeder" varchar(100),
  "is_flagship" boolean DEFAULT false NOT NULL,
  "is_aktif" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "jenis_aktivitas_mbkm_nama_unique" UNIQUE ("nama")
);

CREATE INDEX IF NOT EXISTS "idx_jenis_aktivitas_kode" ON "jenis_aktivitas_mbkm" ("kode");

CREATE TABLE IF NOT EXISTS "aktivitas_mbkm" (
  "id" serial PRIMARY KEY NOT NULL,
  "judul" varchar(255) NOT NULL,
  "jenis_id" integer NOT NULL,
  "periode_id" varchar(5),
  "program_studi_id" integer,
  "lokasi" varchar(255),
  "institusi" varchar(255),
  "tanggal_mulai" date,
  "tanggal_selesai" date,
  "sks" integer DEFAULT 0 NOT NULL,
  "status" varchar(20) DEFAULT 'draft' NOT NULL,
  "deskripsi" text,
  "id_pddikti" varchar(50),
  "created_by_id" integer NOT NULL,
  "disetujui_oleh_id" integer,
  "disetujui_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "aktivitas_mbkm_jenis_id_fkey" FOREIGN KEY ("jenis_id")
    REFERENCES "jenis_aktivitas_mbkm"("id") ON DELETE RESTRICT,
  CONSTRAINT "aktivitas_mbkm_periode_id_fkey" FOREIGN KEY ("periode_id")
    REFERENCES "periode_akademik"("id") ON DELETE SET NULL,
  CONSTRAINT "aktivitas_mbkm_program_studi_id_fkey" FOREIGN KEY ("program_studi_id")
    REFERENCES "program_studi"("id") ON DELETE SET NULL,
  CONSTRAINT "aktivitas_mbkm_created_by_id_fkey" FOREIGN KEY ("created_by_id")
    REFERENCES "users"("id") ON DELETE RESTRICT,
  CONSTRAINT "aktivitas_mbkm_disetujui_oleh_id_fkey" FOREIGN KEY ("disetujui_oleh_id")
    REFERENCES "users"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "idx_aktivitas_mbkm_status" ON "aktivitas_mbkm" ("status");
CREATE INDEX IF NOT EXISTS "idx_aktivitas_mbkm_periode" ON "aktivitas_mbkm" ("periode_id");
CREATE INDEX IF NOT EXISTS "idx_aktivitas_mbkm_prodi" ON "aktivitas_mbkm" ("program_studi_id");
-- Unik parsial: banyak aktivitas boleh ber-`id_pddikti` NULL (activity lokal), tetapi
-- UUID Feeder hanya boleh muncul sekali.
CREATE UNIQUE INDEX IF NOT EXISTS "aktivitas_mbkm_id_pddikti_unique"
  ON "aktivitas_mbkm" ("id_pddikti") WHERE "id_pddikti" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "anggota_aktivitas_mbkm" (
  "id" serial PRIMARY KEY NOT NULL,
  "aktivitas_id" integer NOT NULL,
  "mahasiswa_id" integer NOT NULL,
  "peran" varchar(20) DEFAULT 'anggota' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "anggota_aktivitas_mhs_unique" UNIQUE ("aktivitas_id", "mahasiswa_id"),
  CONSTRAINT "anggota_aktivitas_mbkm_aktivitas_id_fkey" FOREIGN KEY ("aktivitas_id")
    REFERENCES "aktivitas_mbkm"("id") ON DELETE CASCADE,
  CONSTRAINT "anggota_aktivitas_mbkm_mahasiswa_id_fkey" FOREIGN KEY ("mahasiswa_id")
    REFERENCES "mahasiswa"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_anggota_aktivitas_mhs" ON "anggota_aktivitas_mbkm" ("mahasiswa_id");

CREATE TABLE IF NOT EXISTS "bimbing_aktivitas_mbkm" (
  "id" serial PRIMARY KEY NOT NULL,
  "aktivitas_id" integer NOT NULL,
  "dosen_id" integer NOT NULL,
  "kategori" varchar(20) DEFAULT 'pembimbing' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "bimbing_aktivitas_dosen_unique" UNIQUE ("aktivitas_id", "dosen_id"),
  CONSTRAINT "bimbing_aktivitas_mbkm_aktivitas_id_fkey" FOREIGN KEY ("aktivitas_id")
    REFERENCES "aktivitas_mbkm"("id") ON DELETE CASCADE,
  CONSTRAINT "bimbing_aktivitas_mbkm_dosen_id_fkey" FOREIGN KEY ("dosen_id")
    REFERENCES "dosen"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_bimbing_aktivitas_dosen" ON "bimbing_aktivitas_mbkm" ("dosen_id");

CREATE TABLE IF NOT EXISTS "konversi_aktivitas_mbkm" (
  "id" serial PRIMARY KEY NOT NULL,
  "aktivitas_id" integer NOT NULL,
  "mata_kuliah_id" integer NOT NULL,
  "sks_diakui" integer NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "konversi_aktivitas_mk_unique" UNIQUE ("aktivitas_id", "mata_kuliah_id"),
  CONSTRAINT "konversi_aktivitas_mbkm_aktivitas_id_fkey" FOREIGN KEY ("aktivitas_id")
    REFERENCES "aktivitas_mbkm"("id") ON DELETE CASCADE,
  CONSTRAINT "konversi_aktivitas_mbkm_mata_kuliah_id_fkey" FOREIGN KEY ("mata_kuliah_id")
    REFERENCES "mata_kuliah"("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_konversi_aktivitas_mk" ON "konversi_aktivitas_mbkm" ("mata_kuliah_id");

-- Tautan bimbingan → aktivitas MBKM (untuk bimbingan kategori MAGANG hasil auto-taut).
ALTER TABLE "bimbingan" ADD COLUMN IF NOT EXISTS "aktivitas_mbkm_id" integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bimbingan_aktivitas_mbkm_id_fkey'
  ) THEN
    ALTER TABLE "bimbingan"
      ADD CONSTRAINT "bimbingan_aktivitas_mbkm_id_fkey" FOREIGN KEY ("aktivitas_mbkm_id")
      REFERENCES "aktivitas_mbkm"("id") ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_bimbingan_aktivitas_mbkm" ON "bimbingan" ("aktivitas_mbkm_id");

-- Penjaga nilai status di level DB (service juga memvalidasi).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'aktivitas_mbkm_status_check'
  ) THEN
    ALTER TABLE "aktivitas_mbkm"
      ADD CONSTRAINT "aktivitas_mbkm_status_check"
      CHECK ("status" IN ('draft', 'diajukan', 'disetujui', 'ditolak', 'selesai'));
  END IF;
END $$;

-- Seed jenis MBKM: 8 bentuk flagship wajib Dikti + beberapa jenis non-flagship umum.
INSERT INTO "jenis_aktivitas_mbkm" ("nama", "kode", "is_flagship", "is_aktif")
VALUES
  ('Magang', 'MAGANG', true, true),
  ('Praktik Kerja Lapangan', 'PKL', true, true),
  ('Praktik Kerja Lapangan (Industri)', 'PKL_INDUSTRI', true, true),
  ('Kuliah Kerja Praktik', 'KKP', true, true),
  ('Kuliah Kerja Nyanyi', 'KKN', true, true),
  ('Kuliah Kerja Wichakana', 'KKW', true, true),
  ('Kuliah Kerja Taruna', 'KKT', true, true),
  ('Proyek Pengairedan', 'PP', true, true),
  ('Praktikum Terstruktur', 'PRAKTIKUM_TERSTRUKTUR', false, true),
  ('Magang Terpadu', 'MAGANG_TERPADU', false, true),
  ('Kuliah Kerja Lainnya', 'LAINNYA', false, true)
ON CONFLICT ("nama") DO NOTHING;
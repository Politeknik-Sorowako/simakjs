-- Konfigurasi Sistem module: RBAC matrix, user prodi scope, and system params.
-- All statements are idempotent / guarded so they are safe to run repeatedly.

-- Extend user_role enum with Vokasi-specific roles (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    BEGIN
      ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'kaprodi';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'plp';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'instruktur';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "role_groups" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(100) NOT NULL,
  "description" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "role_groups_name_unique" UNIQUE ("name")
);

CREATE TABLE IF NOT EXISTS "permissions" (
  "id" serial PRIMARY KEY NOT NULL,
  "module" varchar(100) NOT NULL,
  "action" varchar(50) NOT NULL,
  "description" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "permissions_module_idx" ON "permissions" ("module");

CREATE TABLE IF NOT EXISTS "role_group_permissions" (
  "id" serial PRIMARY KEY NOT NULL,
  "role_group_id" integer NOT NULL,
  "permission_id" integer NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "role_group_permissions_group_permission_unique" UNIQUE ("role_group_id", "permission_id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'role_group_permissions_role_group_id_role_groups_id_fk'
  ) THEN
    ALTER TABLE "role_group_permissions"
    ADD CONSTRAINT "role_group_permissions_role_group_id_role_groups_id_fk"
    FOREIGN KEY ("role_group_id") REFERENCES "public"."role_groups"("id")
    ON DELETE cascade ON UPDATE no action;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'role_group_permissions_permission_id_permissions_id_fk'
  ) THEN
    ALTER TABLE "role_group_permissions"
    ADD CONSTRAINT "role_group_permissions_permission_id_permissions_id_fk"
    FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id")
    ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "user_prodi_scopes" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "program_studi_id" integer NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "user_prodi_scopes_user_prodi_unique" UNIQUE ("user_id", "program_studi_id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_prodi_scopes_user_id_users_id_fk'
  ) THEN
    ALTER TABLE "user_prodi_scopes"
    ADD CONSTRAINT "user_prodi_scopes_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
    ON DELETE cascade ON UPDATE no action;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_prodi_scopes_program_studi_id_program_studi_id_fk'
  ) THEN
    ALTER TABLE "user_prodi_scopes"
    ADD CONSTRAINT "user_prodi_scopes_program_studi_id_program_studi_id_fk"
    FOREIGN KEY ("program_studi_id") REFERENCES "public"."program_studi"("id")
    ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "user_prodi_scopes_user_idx" ON "user_prodi_scopes" ("user_id");

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_global_scope" boolean DEFAULT false NOT NULL;

ALTER TABLE "system_settings" ADD COLUMN IF NOT EXISTS "param_type" varchar(20) DEFAULT 'string' NOT NULL;
ALTER TABLE "system_settings" ADD COLUMN IF NOT EXISTS "updated_by" integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'system_settings_updated_by_users_id_fk'
  ) THEN
    ALTER TABLE "system_settings"
    ADD CONSTRAINT "system_settings_updated_by_users_id_fk"
    FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id")
    ON DELETE set null ON UPDATE no action;
  END IF;
END $$;

-- Seed default role groups
INSERT INTO "role_groups" ("name", "description")
SELECT 'Superadmin', 'Akses penuh seluruh sistem'
WHERE NOT EXISTS (SELECT 1 FROM "role_groups" WHERE "name" = 'Superadmin');

INSERT INTO "role_groups" ("name", "description")
SELECT 'Administrator', 'Administrator sistem (TI)'
WHERE NOT EXISTS (SELECT 1 FROM "role_groups" WHERE "name" = 'Administrator');

INSERT INTO "role_groups" ("name", "description")
SELECT 'Admin Akademik (BAAK)', 'Pengelola akademik'
WHERE NOT EXISTS (SELECT 1 FROM "role_groups" WHERE "name" = 'Admin Akademik (BAAK)');

INSERT INTO "role_groups" ("name", "description")
SELECT 'Kaprodi', 'Koordinator Program Studi'
WHERE NOT EXISTS (SELECT 1 FROM "role_groups" WHERE "name" = 'Kaprodi');

INSERT INTO "role_groups" ("name", "description")
SELECT 'Dosen Pengampu', 'Dosen pengampu mata kuliah'
WHERE NOT EXISTS (SELECT 1 FROM "role_groups" WHERE "name" = 'Dosen Pengampu');

INSERT INTO "role_groups" ("name", "description")
SELECT 'Pembimbing Akademik (PA)', 'Dosen Pembimbing Akademik'
WHERE NOT EXISTS (SELECT 1 FROM "role_groups" WHERE "name" = 'Pembimbing Akademik (PA)');

INSERT INTO "role_groups" ("name", "description")
SELECT 'PLP / Teknisi Lab / Instruktur', 'Penanganan praktikum, alat, verifikasi kompen manual'
WHERE NOT EXISTS (SELECT 1 FROM "role_groups" WHERE "name" = 'PLP / Teknisi Lab / Instruktur');

INSERT INTO "role_groups" ("name", "description")
SELECT 'Mahasiswa', 'Pengguna mahasiswa'
WHERE NOT EXISTS (SELECT 1 FROM "role_groups" WHERE "name" = 'Mahasiswa');

-- Seed default system parameters (Vokasi compensation rules)
INSERT INTO "system_settings" ("key", "value", "param_type", "description")
VALUES
  ('DURASI_HARIAN_MENIT', '480', 'number', 'Durasi harian kompensasi dalam menit (default 8 jam)'),
  ('PENGALI_DENDA_MANGKIR', '5', 'number', 'Pengali denda untuk Alpa/Terlambat/Rusak'),
  ('PENGALI_DENDA_IZIN_SAKIT', '1', 'number', 'Pengali denda untuk Izin/Sakit'),
  ('AMBANG_SP1_MENIT', '1152', 'number', 'Ambang Surat Peringatan 1 (menit / 24 jam)'),
  ('AMBANG_SP2_MENIT', '1920', 'number', 'Ambang Surat Peringatan 2 (menit / 40 jam)'),
  ('AMBANG_SP3_MENIT', '2304', 'number', 'Ambang Surat Peringatan 3 (menit / 48 jam)'),
  ('LOCK_KARTU_UJIAN_JIKA_KOMPEN', 'false', 'boolean', 'Kunci kartu ujian jika mahasiswa memiliki tanggungan kompensasi')
ON CONFLICT ("key") DO NOTHING;

-- Seed action catalog
INSERT INTO "permissions" ("module", "action", "description")
SELECT m.module, a.action, NULL
FROM (VALUES
  ('dashboard','view'),
  ('mahasiswa','view'), ('mahasiswa','create'), ('mahasiswa','update'), ('mahasiswa','delete'), ('mahasiswa','export'),
  ('dosen','view'), ('dosen','create'), ('dosen','update'), ('dosen','delete'), ('dosen','export'),
  ('krs','view'), ('krs','create'), ('krs','update'), ('krs','delete'), ('krs','export'), ('krs','approve'),
  ('presensi','view'), ('presensi','create'), ('presensi','update'), ('presensi','export'), ('presensi','approve'),
  ('kompensasi','view'), ('kompensasi','create'), ('kompensasi','update'), ('kompensasi','delete'), ('kompensasi','export'), ('kompensasi','approve'),
  ('nilai','view'), ('nilai','create'), ('nilai','update'), ('nilai','export'), ('nilai','approve'),
  ('langsung','view'), ('langsung','export'),
  ('feedback','view'), ('feedback','create'), ('feedback','update'),
  ('konfigurasi','view'), ('konfigurasi','create'), ('konfigurasi','update'), ('konfigurasi','delete')
AS v(module, action)
ON CONFLICT DO NOTHING;
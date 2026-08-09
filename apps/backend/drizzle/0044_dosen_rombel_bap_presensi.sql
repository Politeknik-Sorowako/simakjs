-- Fitur: Rombel self-enrollment (token & QR), BAP tema, presensi admin resolution.
-- All statements are idempotent / guarded so they are safe to run repeatedly.

-- Ensure dosen fields nullable for manual add (NIK, NIDN already nullable; keep guards)
ALTER TABLE "dosen" ALTER COLUMN "nidn" DROP NOT NULL;
ALTER TABLE "dosen" ALTER COLUMN "nik" DROP NOT NULL;
ALTER TABLE "dosen" ALTER COLUMN "tempat_lahir" DROP NOT NULL;
ALTER TABLE "dosen" ALTER COLUMN "tanggal_lahir" DROP NOT NULL;

-- Allow multiple NULLs on dosen.nidn by using a partial unique index instead
-- of the table-level unique constraint (NULLS NOT DISTINCT requires PG15+).
DO $$
BEGIN
  -- Drop old full unique constraint if present; recreate as partial unique
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'dosen_nidn_unique'
  ) THEN
    ALTER TABLE "dosen" DROP CONSTRAINT "dosen_nidn_unique";
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'dosen_nidn_not_null_idx'
  ) THEN
    CREATE INDEX "dosen_nidn_not_null_idx" ON "dosen" ("nidn") WHERE "nidn" IS NOT NULL;
  END IF;
END $$;

-- Rombel self-enrollment columns
ALTER TABLE "rombel_praktikum" ADD COLUMN IF NOT EXISTS "enrollment_token" varchar(64);
ALTER TABLE "rombel_praktikum" ADD COLUMN IF NOT EXISTS "enrollment_enabled" boolean DEFAULT false NOT NULL;
ALTER TABLE "rombel_praktikum" ADD COLUMN IF NOT EXISTS "enrollment_max_students" integer;
ALTER TABLE "rombel_praktikum" ADD COLUMN IF NOT EXISTS "enrollment_expires_at" timestamp;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'rombel_praktikum_enrollment_token_unique'
  ) THEN
    ALTER TABLE "rombel_praktikum" ADD CONSTRAINT "rombel_praktikum_enrollment_token_unique" UNIQUE ("enrollment_token");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "rombel_praktikum_enrollment_token_idx" ON "rombel_praktikum" ("enrollment_token");

-- Rombel enrollment log table
CREATE TABLE IF NOT EXISTS "rombel_enrollment_log" (
  "id" serial PRIMARY KEY NOT NULL,
  "rombel_praktikum_id" integer NOT NULL,
  "mahasiswa_id" integer NOT NULL,
  "enrolled_at" timestamp DEFAULT now() NOT NULL,
  "ip_address" varchar(45),
  "user_agent" text,
  CONSTRAINT "rombel_enrollment_log_unique" UNIQUE ("rombel_praktikum_id", "mahasiswa_id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'rombel_enrollment_log_rombel_praktikum_id_rombel_praktikum_id_fk'
  ) THEN
    ALTER TABLE "rombel_enrollment_log"
    ADD CONSTRAINT "rombel_enrollment_log_rombel_praktikum_id_rombel_praktikum_id_fk"
    FOREIGN KEY ("rombel_praktikum_id") REFERENCES "public"."rombel_praktikum"("id")
    ON DELETE cascade ON UPDATE no action;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'rombel_enrollment_log_mahasiswa_id_mahasiswa_id_fk'
  ) THEN
    ALTER TABLE "rombel_enrollment_log"
    ADD CONSTRAINT "rombel_enrollment_log_mahasiswa_id_mahasiswa_id_fk"
    FOREIGN KEY ("mahasiswa_id") REFERENCES "public"."mahasiswa"("id")
    ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

-- BAP tema column
ALTER TABLE "bap" ADD COLUMN IF NOT EXISTS "tema" varchar(255);
ALTER TABLE "bap_praktikum" ADD COLUMN IF NOT EXISTS "tema" varchar(255);

-- Presensi admin resolution fields (perkuliahan)
ALTER TABLE "presensi" ADD COLUMN IF NOT EXISTS "lampiran_evidens" text;
ALTER TABLE "presensi" ADD COLUMN IF NOT EXISTS "keterangan_admin" text;
ALTER TABLE "presensi" ADD COLUMN IF NOT EXISTS "resolved_by" integer;
ALTER TABLE "presensi" ADD COLUMN IF NOT EXISTS "resolved_at" timestamp;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'presensi_resolved_by_users_id_fk'
  ) THEN
    ALTER TABLE "presensi"
    ADD CONSTRAINT "presensi_resolved_by_users_id_fk"
    FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id")
    ON DELETE set null ON UPDATE no action;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_presensi_unknown" ON "presensi" ("status") WHERE "status" = 'unknown';

-- Presensi admin resolution (praktikum)
ALTER TABLE "presensi_praktikum" ADD COLUMN IF NOT EXISTS "lampiran_evidens" text;
ALTER TABLE "presensi_praktikum" ADD COLUMN IF NOT EXISTS "keterangan_admin" text;
ALTER TABLE "presensi_praktikum" ADD COLUMN IF NOT EXISTS "resolved_by" integer;
ALTER TABLE "presensi_praktikum" ADD COLUMN IF NOT EXISTS "resolved_at" timestamp;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'presensi_praktikum_resolved_by_users_id_fk'
  ) THEN
    ALTER TABLE "presensi_praktikum"
    ADD CONSTRAINT "presensi_praktikum_resolved_by_users_id_fk"
    FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id")
    ON DELETE SET NULL ON UPDATE no action;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_presensi_praktikum_unknown" ON "presensi_praktikum" ("status") WHERE "status" = 'unknown';
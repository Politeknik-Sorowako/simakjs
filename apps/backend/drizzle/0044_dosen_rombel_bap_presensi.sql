-- Fitur: Rombel self-enrollment (token & QR), BAP tema, presensi admin resolution.
-- All statements are idempotent / guarded so they are safe to run repeatedly.

-- DOSEN: allow manual add without NIK/NIDN/tempat lahir/tanggal lahir.
-- NIDN stays nullable but its existing UNIQUE constraint still guarantees
-- non-NULL values are unique (PostgreSQL unique constraints allow multiple NULLs).
ALTER TABLE "dosen" ALTER COLUMN "nidn" DROP NOT NULL;
ALTER TABLE "dosen" ALTER COLUMN "nik" DROP NOT NULL;
ALTER TABLE "dosen" ALTER COLUMN "tempat_lahir" DROP NOT NULL;
ALTER TABLE "dosen" ALTER COLUMN "tanggal_lahir" DROP NOT NULL;

-- Rombel self-enrollment columns
ALTER TABLE "rombel_praktikum" ADD COLUMN IF NOT EXISTS "enrollment_token" varchar(64);
ALTER TABLE "rombel_praktikum" ADD COLUMN IF NOT EXISTS "enrollment_enabled" boolean DEFAULT false NOT NULL;
ALTER TABLE "rombel_praktikum" ADD COLUMN IF NOT EXISTS "enrollment_max_students" integer;
ALTER TABLE "rombel_praktikum" ADD COLUMN IF NOT EXISTS "enrollment_expires_at" timestamp;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'rombel_praktikum_enrollment_token_unique'
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

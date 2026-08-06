-- Rename rombel_praktikum.instrukturId (camelCase) to instruktur_id (snake_case)
-- for consistency with the rest of the schema. Idempotent to prevent deployment crashes.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'rombel_praktikum'
      AND column_name = 'instrukturId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'rombel_praktikum'
      AND column_name = 'instruktur_id'
  ) THEN
    ALTER TABLE "public"."rombel_praktikum" RENAME COLUMN "instrukturId" TO "instruktur_id";
  END IF;
END $$;
--> statement-breakpoint
-- Rename the FK constraint to match the renamed column (idempotent).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rombel_praktikum_instrukturId_dosen_id_fk'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rombel_praktikum_instruktur_id_dosen_id_fk'
  ) THEN
    ALTER TABLE "public"."rombel_praktikum" RENAME CONSTRAINT "rombel_praktikum_instrukturId_dosen_id_fk" TO "rombel_praktikum_instruktur_id_dosen_id_fk";
  END IF;
END $$;

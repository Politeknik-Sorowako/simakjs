-- Phase 1: Mata Kuliah per Program Studi
-- Add program_studi_id to mata_kuliah (nullable for backfill)
ALTER TABLE "mata_kuliah" ADD COLUMN "program_studi_id" integer REFERENCES "program_studi"("id") ON DELETE restrict;--> statement-breakpoint

-- NOTE: Backfill program_studi_id for existing mata_kuliah records before running the next statements.
-- Example: UPDATE "mata_kuliah" SET "program_studi_id" = <prodi_id> WHERE "program_studi_id" IS NULL;
-- After all rows are assigned, run the NOT NULL constraint in a separate migration.

-- Drop old global unique constraint on kode
ALTER TABLE "mata_kuliah" DROP CONSTRAINT IF EXISTS "mata_kuliah_kode_unique";--> statement-breakpoint

-- Add composite unique: kode unik per prodi
ALTER TABLE "mata_kuliah" ADD CONSTRAINT "mata_kuliah_prodi_kode_unique" UNIQUE ("program_studi_id", "kode");--> statement-breakpoint

-- Add composite unique to kurikulum_mata_kuliah: prevent duplicate MK in same kurikulum
ALTER TABLE "kurikulum_mata_kuliah" ADD CONSTRAINT "kurikulum_mata_kuliah_unique" UNIQUE ("kurikulum_id", "mata_kuliah_id");

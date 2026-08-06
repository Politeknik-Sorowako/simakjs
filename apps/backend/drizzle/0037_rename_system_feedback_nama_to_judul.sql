-- Rename system_feedback.nama -> system_feedback.judul to match the Drizzle
-- schema field `judul`. Migration 0032 created the column as "nama", which
-- caused a mismatch between the ORM data property and the physical DB column.
-- All statements are idempotent and safe to re-run.

--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'system_feedback'
      AND column_name = 'nama'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'system_feedback'
      AND column_name = 'judul'
  ) THEN
    ALTER TABLE "public"."system_feedback" RENAME COLUMN "nama" TO "judul";
  END IF;
END $$;
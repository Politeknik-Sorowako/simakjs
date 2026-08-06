-- Cleanup migration:
--   1) Drop legacy orphan column bap_praktikum.instrukturId (camelCase).
--      Schema now maps bapPraktikum.instrukturId -> instruktur_id (snake_case),
--      so the camelCase column is unused and empty.
--   2) Auto-create indexes for every foreign key column that lacks one.
--      These improve JOIN / FK lookup performance as data grows.
-- All statements are idempotent and safe to re-run.

--> statement-breakpoint
-- 1) Drop legacy orphan column if it still exists.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bap_praktikum'
      AND column_name = 'instrukturId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bap_praktikum'
      AND column_name = 'instruktur_id'
  ) THEN
    ALTER TABLE "public"."bap_praktikum" DROP COLUMN "instrukturId";
  ELSEIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bap_praktikum'
      AND column_name = 'instrukturId'
  ) THEN
    -- Both columns exist (instrukturId orphan + instruktur_id). Drop orphan only.
    ALTER TABLE "public"."bap_praktikum" DROP COLUMN "instrukturId";
  END IF;
END $$;

--> statement-breakpoint
-- 2) Create missing FK indexes for all user tables (idempotent).
DO $$
DECLARE
  rec RECORD;
  idx_name TEXT;
  cmd TEXT;
BEGIN
  FOR rec IN
    SELECT
      tc.table_name::text AS tbl,
      kcu.column_name::text AS col,
      kcu.constraint_name::text AS con
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name <> '__drizzle_migrations'
      AND NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = tc.table_name
          AND indexdef ILIKE '%' || kcu.column_name || '%'
      )
  LOOP
    idx_name := 'idx_' || rec.tbl || '_' || rec.col;
    cmd := 'CREATE INDEX IF NOT EXISTS "' || idx_name ||
           '" ON "public"."' || rec.tbl || '" ("' || rec.col || '")';
    BEGIN
      EXECUTE cmd;
    EXCEPTION WHEN duplicate_table THEN
      NULL;
    END;
  END LOOP;
END $$;

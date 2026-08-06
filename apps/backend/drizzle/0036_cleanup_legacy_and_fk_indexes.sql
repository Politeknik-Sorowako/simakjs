-- Cleanup migration:
--   1) Drop legacy orphan column bap_praktikum.instrukturId (camelCase).
--      Schema now maps bapPraktikum.instrukturId -> instruktur_id (snake_case),
--      so the camelCase column is unused and empty.
--   2) Auto-create indexes for every foreign key column that lacks one.
--      These improve JOIN / FK lookup performance as data grows.
-- All statements are idempotent and safe to re-run.

--> statement-breakpoint
-- 1) Drop legacy orphan column if it still exists. Nothing reads the camelCase
--    column (schema maps bapPraktikum.instrukturId -> instruktur_id), and on a
--    fresh DB it never exists, so this is a guarded no-op when already gone.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bap_praktikum'
      AND column_name = 'instrukturId'
  ) THEN
    ALTER TABLE "public"."bap_praktikum" DROP COLUMN "instrukturId";
  END IF;
END $$;

--> statement-breakpoint
-- 2) Create missing FK indexes for all user tables (idempotent).
--    A column is considered covered when ANY existing index (single-column,
--    multi-column, or uniqueness constraint) already includes it. Matching is
--    done against the index definition (indexdef), not an exact index name,
--    so it cannot re-create redundant indexes for columns that are already
--    covered under a differently-named index (e.g. a multi-column unique).
--    The column name is escaped in the LIKE pattern (underscore is a single-char
--    wildcard in ILIKE, so it must be escaped to match literally).
--    CREATE INDEX IF NOT EXISTS is kept as a final safety net, and real errors
--    propagate (no swallowed exceptions) so a failed creation is not hidden.
DO $$
DECLARE
  rec RECORD;
  idx_name TEXT;
  cmd TEXT;
  escaped_col TEXT;
BEGIN
  FOR rec IN
    SELECT
      tc.table_name::text AS tbl,
      kcu.column_name::text AS col,
      replace(kcu.column_name::text, '_', '\_')::text AS esc_col
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
          AND indexdef ILIKE '%' || replace(kcu.column_name::text, '_', '\_') || '%'
      )
  LOOP
    idx_name := 'idx_' || rec.tbl || '_' || rec.col;
    escaped_col := rec.esc_col;
    cmd := 'CREATE INDEX IF NOT EXISTS "' || idx_name ||
           '" ON "public"."' || rec.tbl || '" ("' || rec.col || '")';
    EXECUTE cmd;
  END LOOP;
END $$;

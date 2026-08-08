-- Multi-role users: introduce a junction table (user <-> role) so a user can
-- hold multiple roles. The legacy single `users.role` column is KEPT (deprecated)
-- to preserve backward compatibility and allow easy rollback.
-- All statements are idempotent / guarded.

-- 1) Create the `user_roles` junction table.
CREATE TABLE IF NOT EXISTS "user_roles" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "role" "user_role" NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- 2) Unique constraint so a user cannot hold the same role twice.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'user_roles_user_role_unique'
  ) THEN
    CREATE UNIQUE INDEX "user_roles_user_role_unique" ON "user_roles" ("user_id", "role");
  END IF;
END $$;

-- 3) Index for reverse lookups (role -> users).
CREATE INDEX IF NOT EXISTS "user_roles_role_idx" ON "user_roles" ("role");

-- 4) Foreign key to users. Guarded so it only runs once.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_id_fkey'
  ) THEN
    ALTER TABLE "user_roles"
      ADD CONSTRAINT "user_roles_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;
  END IF;
END $$;

-- 5) BACKFILL: copy each user's current single role into the junction table.
--    This preserves existing access (2 admin, 41 dosen) before any code reads
--    roles from the junction table.
INSERT INTO "user_roles" ("user_id", "role")
SELECT "id", "role" FROM "users"
WHERE "role" IS NOT NULL
ON CONFLICT ("user_id", "role") DO NOTHING;
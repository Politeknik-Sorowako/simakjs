-- Migrasi penambahan multi-role target pada pengumuman
-- Idempoten: aman dijalankan berulang

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pengumuman' AND column_name = 'target_roles'
  ) THEN
    ALTER TABLE "pengumuman" ADD COLUMN "target_roles" text[] DEFAULT ARRAY['semua']::text[] NOT NULL;
  END IF;
END $$;

-- Backfill data lama dari target_role yang sudah ada
UPDATE "pengumuman"
SET "target_roles" = ARRAY["target_role"::text]
WHERE "target_roles" IS NULL OR "target_roles" = ARRAY['semua']::text[];

-- Buat GIN index untuk pencarian array overlap (&&) yang efisien
CREATE INDEX IF NOT EXISTS "idx_pengumuman_target_roles_gin"
  ON "pengumuman" USING GIN ("target_roles");

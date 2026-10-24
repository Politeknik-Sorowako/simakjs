-- Tambah role type 'wadir1', 'wadir3', 'direktur' sebagai pilihan pada "Atur Peran" (/pengguna).
-- Extend user_role enum with wadir1, wadir3, direktur (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    BEGIN
      ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'wadir1';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'wadir3';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'direktur';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

INSERT INTO "role_groups" ("name", "description", "role_type", "role_value", "is_system", "is_active")
SELECT 'Wadir 1', 'Wakil Direktur 1 Bidang Akademik', 'user_role', 'wadir1', false, true
WHERE NOT EXISTS (
  SELECT 1 FROM "role_groups"
  WHERE "role_type" = 'user_role' AND "role_value" = 'wadir1'
)
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "role_groups" ("name", "description", "role_type", "role_value", "is_system", "is_active")
SELECT 'Wadir 3', 'Wakil Direktur 3 Bidang Kemahasiswaan & Kerjasama', 'user_role', 'wadir3', false, true
WHERE NOT EXISTS (
  SELECT 1 FROM "role_groups"
  WHERE "role_type" = 'user_role' AND "role_value" = 'wadir3'
)
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "role_groups" ("name", "description", "role_type", "role_value", "is_system", "is_active")
SELECT 'Direktur', 'Direktur Politeknik Sorowako', 'user_role', 'direktur', false, true
WHERE NOT EXISTS (
  SELECT 1 FROM "role_groups"
  WHERE "role_type" = 'user_role' AND "role_value" = 'direktur'
)
ON CONFLICT ("name") DO NOTHING;

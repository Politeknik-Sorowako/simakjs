-- Tambah role type 'wadir2' sebagai pilihan pada "Atur Peran" (/pengguna).
-- Extend user_role enum with wadir2 (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    BEGIN
      ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'wadir2';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

INSERT INTO "role_groups" ("name", "description", "role_type", "role_value", "is_system", "is_active")
SELECT 'Wadir 2', 'Wakil Direktur 2 Bidang Keuangan & Administrasi Umum', 'user_role', 'wadir2', false, true
WHERE NOT EXISTS (
  SELECT 1 FROM "role_groups"
  WHERE "role_type" = 'user_role' AND "role_value" = 'wadir2'
)
ON CONFLICT ("name") DO NOTHING;

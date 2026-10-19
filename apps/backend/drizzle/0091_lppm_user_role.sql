-- Tambah role type 'lppm' sebagai pilihan pada "Atur Peran" (/pengguna).
-- Extend user_role enum with lppm (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    BEGIN
      ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'lppm';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

INSERT INTO "role_groups" ("name", "description", "role_type", "role_value", "is_system", "is_active")
SELECT 'LPPM', 'Lembaga Penelitian dan Pengabdian kepada Masyarakat', 'user_role', 'lppm', false, true
WHERE NOT EXISTS (
  SELECT 1 FROM "role_groups"
  WHERE "role_type" = 'user_role' AND "role_value" = 'lppm'
)
ON CONFLICT ("name") DO NOTHING;

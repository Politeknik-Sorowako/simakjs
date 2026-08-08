-- Konfigurasi Sistem: role types + simplified 3-level access matrix.
-- All statements are idempotent / guarded so they are safe to run repeatedly.

-- 1) Extend role_groups to also hold user role types distinct from RBAC groups.
ALTER TABLE "role_groups" ADD COLUMN IF NOT EXISTS "role_type" varchar(20) DEFAULT 'rbac_group' NOT NULL;
ALTER TABLE "role_groups" ADD COLUMN IF NOT EXISTS "role_value" varchar(50);
ALTER TABLE "role_groups" ADD COLUMN IF NOT EXISTS "is_system" boolean DEFAULT false NOT NULL;

-- 2) Mark reusable RBAC groups as user role types (they already carry an RBAC matrix).
DO $$
BEGIN
  UPDATE "role_groups" SET "role_type" = 'user_role', "role_value" = 'kaprodi'           WHERE "name" = 'Kaprodi'    AND "role_type" = 'rbac_group';
  UPDATE "role_groups" SET "role_type" = 'user_role', "role_value" = 'dosen'            WHERE "name" = 'Dosen Pengampu' AND "role_type" = 'rbac_group';
  UPDATE "role_groups" SET "role_type" = 'user_role', "role_value" = 'instruktur'       WHERE "name" = 'Instruktur' AND "role_type" = 'rbac_group';
  UPDATE "role_groups" SET "role_type" = 'user_role', "role_value" = 'mahasiswa'        WHERE "name" = 'Mahasiswa'  AND "role_type" = 'rbac_group';
  UPDATE "role_groups" SET "role_type" = 'user_role', "role_value" = 'keuangan'         WHERE "name" = 'Admin Akademik (BAAK)' AND "role_type" = 'rbac_group';
END $$;

-- 3) Seed remaining user role types that do not yet map to an existing group.
--    Superadmin intentionally excluded (has unlimited access, not configurable).
INSERT INTO "role_groups" ("name", "description", "role_type", "role_value", "is_system", "is_active")
SELECT v.name, v.description, 'user_role', v.role_value, false, true
FROM (VALUES
  ('Admin Prodi', 'Administrator Program Studi', 'prodi'),
  ('PLP / Teknisi Lab', 'Praktisi Lab / Teknisi', 'plp'),
  ('Guest', 'Akses terbatas / tamu', 'guest'),
  ('Calon Mahasiswa', 'Pendaftar / calon mahasiswa', 'calon_mahasiswa')
) AS v(name, description, role_value)
WHERE NOT EXISTS (
  SELECT 1 FROM "role_groups" g
  WHERE g.role_type = 'user_role' AND g.role_value = v.role_value
)
ON CONFLICT ("name") DO NOTHING;

-- 4) SO list of user role types required for the "Atur Peran" picker.
INSERT INTO "role_groups" ("name", "description", "role_type", "role_value", "is_system", "is_active")
SELECT 'Admin', 'Administrator sistem', 'user_role', 'admin', false, true
WHERE NOT EXISTS (SELECT 1 FROM "role_groups" WHERE "role_type" = 'user_role' AND "role_value" = 'admin');

-- 5) Ensure super_admin stays an RBAC-only group (never a selectable user role).
UPDATE "role_groups" SET "role_type" = 'rbac_group', "is_system" = true
WHERE "name" = 'Superadmin' AND "role_value" IS NULL;

CREATE INDEX IF NOT EXISTS "role_groups_role_type_idx" ON "role_groups" ("role_type");
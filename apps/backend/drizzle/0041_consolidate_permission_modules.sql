-- Consolidate permission modules into 17 business-aligned modules.
-- 1) Deduplicate permission rows (earlier seeds ran repeatedly without a unique constraint).
-- 2) Add a unique constraint on (module, action) to prevent future duplicates.
-- 3) Remove the obsolete 'langsung' module.
-- 4) Insert the new consolidated modules.
-- 5) Grant all permissions to Superadmin and Administrator role groups by default.
-- All statements are idempotent / guarded.

-- Step 1: Deduplicate existing permission rows (keep the lowest id per module+action).
DELETE FROM "permissions" a USING "permissions" b
WHERE a.id > b.id
  AND a.module = b.module
  AND a.action = b.action;

-- Step 2: Ensure a unique constraint exists to prevent duplicates going forward.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'permissions_module_action_unique'
  ) THEN
    CREATE UNIQUE INDEX "permissions_module_action_unique" ON "permissions" ("module", "action");
  END IF;
END $$;

-- Step 3: Remove obsolete 'langsung' module (along with its role-group grants).
DELETE FROM "role_group_permissions"
WHERE "permission_id" IN (SELECT "id" FROM "permissions" WHERE "module" = 'langsung');
DELETE FROM "permissions" WHERE "module" = 'langsung';

-- Step 4: Insert the consolidated module catalog (idempotent due to unique index).
INSERT INTO "permissions" ("module", "action", "description")
SELECT v.module, v.action, NULL
FROM (VALUES
  ('dashboard','view'),
  ('mahasiswa','view'), ('mahasiswa','create'), ('mahasiswa','update'), ('mahasiswa','delete'), ('mahasiswa','export'),
  ('dosen','view'), ('dosen','create'), ('dosen','update'), ('dosen','delete'), ('dosen','export'),
  ('krs','view'), ('krs','create'), ('krs','update'), ('krs','delete'), ('krs','export'), ('krs','approve'),
  ('presensi','view'), ('presensi','create'), ('presensi','update'), ('presensi','export'), ('presensi','approve'),
  ('kompensasi','view'), ('kompensasi','create'), ('kompensasi','update'), ('kompensasi','delete'), ('kompensasi','export'), ('kompensasi','approve'),
  ('nilai','view'), ('nilai','create'), ('nilai','update'), ('nilai','export'), ('nilai','approve'),
  ('feedback','view'), ('feedback','create'), ('feedback','update'),
  ('konfigurasi','view'), ('konfigurasi','create'), ('konfigurasi','update'), ('konfigurasi','delete'),
  ('kurikulum','view'), ('kurikulum','create'), ('kurikulum','update'), ('kurikulum','delete'), ('kurikulum','export'),
  ('evaluasi','view'), ('evaluasi','create'), ('evaluasi','update'), ('evaluasi','export'), ('evaluasi','approve'),
  ('layanan','view'), ('layanan','create'), ('layanan','update'), ('layanan','delete'), ('layanan','export'),
  ('laporan','view'), ('laporan','export'),
  ('keuangan','view'), ('keuangan','create'), ('keuangan','update'), ('keuangan','delete'), ('keuangan','export'), ('keuangan','approve'),
  ('admisi','view'), ('admisi','create'), ('admisi','update'), ('admisi','delete'), ('admisi','export'), ('admisi','approve'),
  ('apel','view'), ('apel','create'), ('apel','update'), ('apel','export'), ('apel','approve'),
  ('bimbingan','view'), ('bimbingan','create'), ('bimbingan','update'), ('bimbingan','export')
) AS v(module, action)
ON CONFLICT ("module", "action") DO NOTHING;

-- Step 5: Grant all permissions to Super Admin and Administrator by default
-- (only if they have not yet been granted anything, to preserve explicit admin config).
INSERT INTO "role_group_permissions" ("role_group_id", "permission_id")
SELECT rg.id, p.id
FROM "role_groups" rg
CROSS JOIN "permissions" p
WHERE rg.name IN ('Superadmin', 'Administrator')
  AND NOT EXISTS (
    SELECT 1 FROM "role_group_permissions" rgp WHERE rgp.role_group_id = rg.id
  )
ON CONFLICT ("role_group_id", "permission_id") DO NOTHING;
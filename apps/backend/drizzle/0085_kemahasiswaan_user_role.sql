-- Tambah role type 'kemahasiswaan' sebagai pilihan pada "Atur Peran" (/pengguna).
-- Enum user_role sudah diperluas di migrasi 0084; file ini melengkapi baris
-- role_groups (role_type='user_role') agar role tampil di picker UI.
-- Idempoten: aman dijalankan berulang.

INSERT INTO "role_groups" ("name", "description", "role_type", "role_value", "is_system", "is_active")
SELECT 'Kemahasiswaan', 'Verifikator kegiatan kemahasiswaan / SKPI', 'user_role', 'kemahasiswaan', false, true
WHERE NOT EXISTS (
  SELECT 1 FROM "role_groups"
  WHERE "role_type" = 'user_role' AND "role_value" = 'kemahasiswaan'
)
ON CONFLICT ("name") DO NOTHING;

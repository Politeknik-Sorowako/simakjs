-- =========================================================
-- SIMAK Vokasi - Staging Database Sanitization Script
-- Dijalankan secara otomatis setelah database Staging direstore dari Production
-- Memask seluruh PII agar aman untuk lingkungan uji.
-- Idempotent: aman dijalankan berkali-kali.
-- =========================================================

BEGIN;

-- =========================================================
-- 1. USERS (akun login, termasuk guest/calon_mahasiswa/plp)
--    Super Admin & Admin tetap eksplisit, sisanya di-mask.
-- =========================================================
UPDATE users
SET password = '$2a$12$e6fU/7vO8zL.s0vU2G2C1.qD4mYx1l5nK8bV.gZ/rJ3xR7kY.p6qO',
    nama     = 'User ' || id,
    email    = CONCAT('user_', id, '@staging.simak.local'),
    avatar   = NULL
WHERE role NOT IN ('super_admin', 'admin');

-- Pertahankan email/nama admin agar bisa login staging, tapi reset kata sandinya
UPDATE users
SET password = '$2a$12$e6fU/7vO8zL.s0vU2G2C1.qD4mYx1l5nK8bV.gZ/rJ3xR7kY.p6qO'
WHERE role IN ('super_admin', 'admin') AND is_active = true;

-- =========================================================
-- 2. DOSEN
-- =========================================================
UPDATE dosen
SET nama           = 'Dosen ' || id,
    email          = CONCAT('dosen_', id, '@staging.simak.local'),
    nik            = COALESCE(LEFT('00000000' || id::text, 16), '0000000000000000'),
    nidn           = NULL,
    tempat_lahir   = NULL,
    tanggal_lahir  = NULL
WHERE email IS NOT NULL;

-- =========================================================
-- 3. MAHASISWA
-- =========================================================
UPDATE mahasiswa
SET nama             = 'Mahasiswa ' || id,
    email            = CONCAT('mhs_', id, '@staging.simak.local'),
    nim              = CONCAT('NIM', RIGHT(COALESCE(angkatan, '0000'), 4), LPAD(id::text, 5, '0')),
    nik              = COALESCE(LEFT('00000000' || id::text, 16), '0000000000000000'),
    nama_ibu_kandung = 'Ibu ' || id,
    tanggal_lahir    = NULL,
    tempat_lahir     = NULL,
    jalan            = NULL,
    rt               = NULL,
    rw               = NULL,
    kode_pos         = NULL
WHERE email IS NOT NULL;

-- =========================================================
-- 4. APPLICATIONS (calon mahasiswa saat penerimaan)
-- =========================================================
UPDATE applications
SET nik             = COALESCE(LEFT('00000000' || id::text, 16), '0000000000000000'),
    nama_lengkap    = 'Calon Mahasiswa ' || id,
    tempat_lahir    = NULL,
    tanggal_lahir   = NULL,
    jalan           = NULL,
    rt              = NULL,
    rw              = NULL,
    kode_pos        = NULL,
    telepon         = NULL,
    nama_ibu_kandung = 'Ibu ' || id,
    no_pendaftar    = NULL
WHERE id IS NOT NULL;

-- =========================================================
-- 5. Token reset password & data sementara dihapus
-- =========================================================
TRUNCATE TABLE password_resets;

-- =========================================================
-- 6. Kueri verifikasi: data PII asli yang MASIHTERTINGGAL boleh jadi 0
-- =========================================================
SELECT 'REMAINING_ASLI' AS check_name,
       COUNT(*)        AS jumlah
FROM (
    SELECT email FROM users   WHERE email NOT LIKE '%@staging.simak.local'
    UNION ALL
    SELECT email FROM dosen   WHERE email NOT LIKE '%@staging.simak.local'
    UNION ALL
    SELECT email FROM mahasiswa WHERE email NOT LIKE '%@staging.simak.local'
) AS remaining;

SELECT 'NIK_ASLI_MAHASISWA' AS check_name, COUNT(*) AS jumlah
FROM mahasiswa WHERE nik IS NOT NULL AND nik NOT LIKE '0%';

SELECT 'NIM_ASLI_MAHASISWA' AS check_name, COUNT(*) AS jumlah
FROM mahasiswa WHERE nim IS NOT NULL AND nim NOT LIKE 'NIM%';

SELECT 'NIK_ASLI_DOSEN' AS check_name, COUNT(*) AS jumlah
FROM dosen WHERE nik IS NOT NULL AND nik NOT LIKE '0%';

SELECT 'NAMA_IBU_ASLI' AS check_name, COUNT(*) AS jumlah
FROM mahasiswa WHERE nama_ibu_kandung IS NOT NULL AND nama_ibu_kandung NOT LIKE 'Ibu %';

-- Tandai database sebagai STAGING untuk audit
COMMENT ON DATABASE CURRENT_DATABASE IS 'STAGING DATABASE - Restored and sanitized automatically from Production';

COMMIT;
-- =========================================================
-- SIMAK Vokasi - Staging Database Sanitization Script
-- Dijalankan secara otomatis setelah database Staging direstore dari Production
-- =========================================================

BEGIN;

-- 1. Reset password untuk pengguna non-admin ke default hash ("Staging123!")
-- bcrypt hash for "Staging123!" with cost 12
UPDATE users
SET password = '$2a$12$e6fU/7vO8zL.s0vU2G2C1.qD4mYx1l5nK8bV.gZ/rJ3xR7kY.p6qO'
WHERE role NOT IN ('superadmin', 'admin');

-- 2. Sanitasi / Masking PII Data (Email) di Staging
UPDATE users 
SET email = CONCAT('user_', id, '@staging.simak.local') 
WHERE role NOT IN ('superadmin', 'admin') AND email IS NOT NULL;

UPDATE mahasiswa 
SET email = CONCAT('mhs_', id, '@staging.simak.local') 
WHERE email IS NOT NULL;

UPDATE dosen 
SET email = CONCAT('dosen_', id, '@staging.simak.local') 
WHERE email IS NOT NULL;

-- 3. Bersihkan token reset password
TRUNCATE TABLE password_resets;

-- 4. Tambahkan catatan audit ke log database bahwa database ini adalah STAGING
COMMENT ON DATABASE CURRENT_DATABASE IS 'STAGING DATABASE - Restored and sanitized automatically from Production';

COMMIT;

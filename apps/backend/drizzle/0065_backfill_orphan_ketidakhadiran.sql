-- Fitur: Backfill idempoten baris ketidakhadiran_mahasiswa yang hilang (orphan).
-- Latar belakang: beberapa jalur (duplikasi BAP, endpoint resolve lama, re-save presensi)
-- dapat meninggalkan baris presensi/presensi_praktikum/presensi_apel tanpa pasangan di
-- tabel terpusat. Akibatnya tombol Anulir/Konfirmasi mengembalikan 404 "Data ketidakhadiran
-- tidak ditemukan". Migrasi ini membentuk ulang pasangan yang hilang tanpa menyentuh data
-- yang sudah ada. Aman dijalankan berulang kali (NOT EXISTS + ON CONFLICT DO NOTHING).

-- 1) Sumber BAP (presensi teori)
INSERT INTO "ketidakhadiran_mahasiswa"
  ("mahasiswa_id", "tanggal", "sumber", "sumber_id", "status", "durasi_menit", "is_verified", "created_at", "updated_at")
SELECT
  p."mahasiswa_id",
  b."tanggal",
  'BAP',
  p."id",
  (CASE WHEN p."status"::text = 'telat' THEN 'TERLAMBAT' ELSE UPPER(p."status"::text) END)::"ketidakhadiran_status",
  COALESCE(p."durasi_mangkir", 0)::integer,
  (p."status"::text <> 'unknown'),
  now(),
  now()
FROM "presensi" p
JOIN "bap" b ON b."id" = p."bap_id"
WHERE p."status"::text <> 'hadir'
  AND NOT EXISTS (
    SELECT 1 FROM "ketidakhadiran_mahasiswa" k
    WHERE k."sumber" = 'BAP' AND k."sumber_id" = p."id"
  )
ON CONFLICT ("sumber", "sumber_id") DO NOTHING;

-- 2) Sumber APEL (presensi_apel)
INSERT INTO "ketidakhadiran_mahasiswa"
  ("mahasiswa_id", "tanggal", "sumber", "sumber_id", "status", "durasi_menit", "is_verified", "created_at", "updated_at")
SELECT
  pa."mahasiswa_id",
  sa."tanggal",
  'APEL',
  pa."id",
  (CASE
    WHEN COALESCE(pa."verified_status", pa."status")::text = 'telat' THEN 'TERLAMBAT'
    ELSE UPPER(COALESCE(pa."verified_status", pa."status")::text)
  END)::"ketidakhadiran_status",
  COALESCE(pa."menit_terlambat", 0)::integer,
  (COALESCE(pa."verified_status", pa."status")::text <> 'unknown'),
  now(),
  now()
FROM "presensi_apel" pa
JOIN "sesi_apel" sa ON sa."id" = pa."sesi_apel_id"
WHERE COALESCE(pa."verified_status", pa."status")::text <> 'hadir'
  AND NOT EXISTS (
    SELECT 1 FROM "ketidakhadiran_mahasiswa" k
    WHERE k."sumber" = 'APEL' AND k."sumber_id" = pa."id"
  )
ON CONFLICT ("sumber", "sumber_id") DO NOTHING;

-- 3) Sumber PRAKTIKUM (presensi_praktikum)
INSERT INTO "ketidakhadiran_mahasiswa"
  ("mahasiswa_id", "tanggal", "sumber", "sumber_id", "status", "durasi_menit", "is_verified", "created_at", "updated_at")
SELECT
  pp."mahasiswa_id",
  bp."tanggal",
  'PRAKTIKUM',
  pp."id",
  (CASE WHEN pp."status"::text = 'telat' THEN 'TERLAMBAT' ELSE UPPER(pp."status"::text) END)::"ketidakhadiran_status",
  COALESCE(pp."durasi_mangkir", 0)::integer,
  (pp."status"::text <> 'unknown'),
  now(),
  now()
FROM "presensi_praktikum" pp
JOIN "bap_praktikum" bp ON bp."id" = pp."bap_praktikum_id"
WHERE pp."status"::text <> 'hadir'
  AND NOT EXISTS (
    SELECT 1 FROM "ketidakhadiran_mahasiswa" k
    WHERE k."sumber" = 'PRAKTIKUM' AND k."sumber_id" = pp."id"
  )
ON CONFLICT ("sumber", "sumber_id") DO NOTHING;

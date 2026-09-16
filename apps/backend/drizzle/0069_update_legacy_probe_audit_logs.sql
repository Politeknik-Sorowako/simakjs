UPDATE "audit_logs"
SET
  "status_code" = 404,
  "is_success" = false,
  "description" = REGEXP_REPLACE(
    "description",
    'Sistem melakukan (tambah|update|delete|baca) data pada tabel ([a-zA-Z0-9_-]+)\.?',
    'Sistem gagal melakukan \1 data pada tabel \2: Route Not Found (HTTP 404).'
  )
WHERE "user_id" IS NULL
  AND (
    "module" NOT IN (
      'auth', 'users', 'user', 'mahasiswa', 'dosen', 'mata-kuliah', 'mata_kuliah', 'matakuliah',
      'kelas-kuliah', 'kelaskuliah', 'krs', 'tagihan', 'program-studi', 'program_studi', 'prodi',
      'bap', 'pelanggaran', 'sesi-apel', 'sesiapel', 'apel', 'presensi', 'kompensasi-bayar',
      'kompensasibayar', 'kurikulum', 'nilai-praktik', 'nilaipraktik', 'audit-logs', 'audit_logs',
      'audit', 'settings', 'backup'
    )
    OR "detail" LIKE '%/rds/%'
    OR "detail" LIKE '%/phpmyadmin%'
    OR "detail" LIKE '%.env%'
  );

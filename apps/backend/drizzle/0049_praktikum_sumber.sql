-- Fitur: Dukungan sumber PRAKTIKUM pada tabel terpusat ketidakhadiran.
-- Presensi praktikum kini disinkronkan ke ketidakhadiran_mahasiswa (sumber='PRAKTIKUM')
-- dan dapat diverifikasi admin melalui alur VerifikasiUnknownService.
-- Statement idempotent / guarded agar aman dijalankan berulang kali.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'ketidakhadiran_sumber' AND e.enumlabel = 'PRAKTIKUM'
  ) THEN
    ALTER TYPE "ketidakhadiran_sumber" ADD VALUE 'PRAKTIKUM';
  END IF;
END $$;

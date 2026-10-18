-- Penetapan Pembimbing Mahasiswa (PKL/Magang & Tugas Akhir 1 & 2).
-- PA tetap memakai kolom `mahasiswa.dosen_pa_id` (tidak diubah).
-- Pembimbing eksternal dicatat terstruktur (nama + instansi) tanpa tabel dosen.
-- Pergantian pembimbing mempertahankan riwayat lewat `status_aktif`.
-- Idempoten: aman dijalankan berulang.

CREATE TABLE IF NOT EXISTS "pembimbing_mahasiswa" (
  "id" serial PRIMARY KEY NOT NULL,
  "mahasiswa_id" integer NOT NULL,
  "dosen_id" integer,
  "nama_eksternal" varchar(100),
  "instansi_eksternal" varchar(255),
  "jenis" varchar(20) NOT NULL,
  "status_aktif" boolean DEFAULT true NOT NULL,
  "ditetapkan_oleh_id" integer,
  "catatan" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "pembimbing_mahasiswa_mahasiswa_id_fkey" FOREIGN KEY ("mahasiswa_id")
    REFERENCES "mahasiswa"("id") ON DELETE CASCADE,
  CONSTRAINT "pembimbing_mahasiswa_dosen_id_fkey" FOREIGN KEY ("dosen_id")
    REFERENCES "dosen"("id") ON DELETE SET NULL,
  CONSTRAINT "pembimbing_mahasiswa_ditetapkan_oleh_id_fkey" FOREIGN KEY ("ditetapkan_oleh_id")
    REFERENCES "users"("id") ON DELETE SET NULL
);

-- Hanya satu penetapan AKTIF per (mahasiswa, jenis). Unik parsial tidak dapat
-- dideklarasikan lewat Drizzle `unique()`, karena itu ditulis langsung di SQL.
-- Nonaktifkan baris lama (status_aktif=false) sebelum insert baris baru.
CREATE UNIQUE INDEX IF NOT EXISTS "pembimbing_mhs_jenis_aktif_unique"
  ON "pembimbing_mahasiswa" ("mahasiswa_id", "jenis") WHERE "status_aktif" = true;

CREATE INDEX IF NOT EXISTS "idx_pembimbing_mhs_jenis" ON "pembimbing_mahasiswa" ("mahasiswa_id", "jenis");
CREATE INDEX IF NOT EXISTS "idx_pembimbing_dosen" ON "pembimbing_mahasiswa" ("dosen_id");
CREATE INDEX IF NOT EXISTS "idx_pembimbing_aktif" ON "pembimbing_mahasiswa" ("status_aktif");

-- Penjaga nilai jenis di level DB (service juga memvalidasi).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pembimbing_mahasiswa_jenis_check'
  ) THEN
    ALTER TABLE "pembimbing_mahasiswa"
      ADD CONSTRAINT "pembimbing_mahasiswa_jenis_check"
      CHECK ("jenis" IN ('PKL', 'TA_UTAMA', 'TA_PENDAMPING'));
  END IF;
END $$;
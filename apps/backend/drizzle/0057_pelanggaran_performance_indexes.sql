-- Idempotent Migration: Performance Indexes for Pelanggaran Reports
-- Optimasi query laporan peringatan (getAllPelanggaran & getRekapPasalTop10)
CREATE INDEX IF NOT EXISTS "idx_pelanggaran_periode_mhs_tanggal" ON "pelanggaran" ("periode_id", "mahasiswa_id", "tanggal");
CREATE INDEX IF NOT EXISTS "idx_pelanggaran_pasal_id" ON "pelanggaran" ("pasal_id");
CREATE INDEX IF NOT EXISTS "idx_pelanggaran_mahasiswa_id" ON "pelanggaran" ("mahasiswa_id");
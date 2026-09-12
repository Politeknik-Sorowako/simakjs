-- Fitur: Respons/balasan mahasiswa per sesi bimbingan.
-- Mahasiswa dapat menanggapi catatan (solusi) dosen pada tiap sesi bimbingan.
-- Idempoten: aman dijalankan berulang.

ALTER TABLE "sesi_bimbingan" ADD COLUMN IF NOT EXISTS "respons_mahasiswa" text;

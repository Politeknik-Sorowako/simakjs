-- Tabel Tindak Lanjut Pelanggaran & Persetujuan Berjenjang (BPA)
CREATE TABLE IF NOT EXISTS "pelanggaran_tindak_lanjut" (
  "id" serial PRIMARY KEY,
  "mahasiswa_id" integer NOT NULL REFERENCES "mahasiswa"("id") ON DELETE CASCADE,
  "periode_id" varchar(5) NOT NULL REFERENCES "periode_akademik"("id") ON DELETE CASCADE,
  "tingkat" varchar(20) NOT NULL, -- LEVEL_1 | LEVEL_2 | LEVEL_3 | LEVEL_4
  "pemicu_tipe" varchar(20) NOT NULL, -- SEMESTER | AKUMULASI
  "pemicu_t_nilai" integer NOT NULL, -- Poin T pemicu (misal 1, 2, 5, dsb)
  "status" varchar(30) NOT NULL DEFAULT 'MENUNGGU_FORM', -- MENUNGGU_FORM | MENUNGGU_PERSETUJUAN | REVISI | SELESAI | DIBATALKAN
  "form_coaching" jsonb,
  "surat_pemanggilan_ortu" jsonb,
  "berita_acara_sidang" jsonb,
  "form_diisi_oleh" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "form_diisi_at" timestamp,
  "alasan_batal" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_tl_mhs_periode_tingkat"
  ON "pelanggaran_tindak_lanjut" ("mahasiswa_id", "periode_id", "tingkat");
CREATE INDEX IF NOT EXISTS "idx_tl_status" ON "pelanggaran_tindak_lanjut" ("status");
CREATE INDEX IF NOT EXISTS "idx_tl_periode" ON "pelanggaran_tindak_lanjut" ("periode_id");

CREATE TABLE IF NOT EXISTS "pelanggaran_tindak_lanjut_persetujuan" (
  "id" serial PRIMARY KEY,
  "tindak_lanjut_id" integer NOT NULL REFERENCES "pelanggaran_tindak_lanjut"("id") ON DELETE CASCADE,
  "approver_role" varchar(20) NOT NULL, -- kaprodi | wadir1 | wadir3 | direktur
  "urutan" integer NOT NULL, -- 1, 2, 3, 4
  "status" varchar(20) NOT NULL DEFAULT 'MENUNGGU', -- MENUNGGU | DISETUJUI | DITOLAK
  "metode" varchar(10), -- TTE | MANUAL
  "approver_user_id" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "approver_nama" varchar(255),
  "catatan" text,
  "signature_uuid" uuid,
  "dokumen_scan_url" text,
  "decided_at" timestamp
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_tlp_tl_role"
  ON "pelanggaran_tindak_lanjut_persetujuan" ("tindak_lanjut_id", "approver_role");
CREATE INDEX IF NOT EXISTS "idx_tlp_status" ON "pelanggaran_tindak_lanjut_persetujuan" ("status");

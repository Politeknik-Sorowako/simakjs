-- Riwayat perubahan status manual (override) pada Aktivitas MBKM.
--
-- Alur normal (draft → diajukan → disetujui/ditolak → selesai) dijaga ketat di
-- service. Role admin/super_admin/prodi/kaprodi tetap dapat memaksa perpindahan
-- status apa pun karena kebutuhan koreksi data di lapangan. Setiap override
-- WAJIB menyertakan alasan dan tercatat permanen di tabel ini — audit log
-- otomatis hanya menyimpan URL/pengguna, bukan alasan maupun status asal.
--
-- Idempoten: aman dijalankan berulang.

CREATE TABLE IF NOT EXISTS "aktivitas_mbkm_status_log" (
  "id" serial PRIMARY KEY NOT NULL,
  "aktivitas_id" integer NOT NULL,
  "dari_status" varchar(20),
  "ke_status" varchar(20) NOT NULL,
  "alasan" text NOT NULL,
  "oleh_user_id" integer,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "aktivitas_mbkm_status_log_aktivitas_id_fkey" FOREIGN KEY ("aktivitas_id")
    REFERENCES "aktivitas_mbkm"("id") ON DELETE CASCADE,
  CONSTRAINT "aktivitas_mbkm_status_log_oleh_user_id_fkey" FOREIGN KEY ("oleh_user_id")
    REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "aktivitas_mbkm_status_log_ke_status_check"
    CHECK ("ke_status" IN ('draft', 'diajukan', 'disetujui', 'ditolak', 'selesai')),
  CONSTRAINT "aktivitas_mbkm_status_log_dari_status_check"
    CHECK ("dari_status" IS NULL OR "dari_status" IN ('draft', 'diajukan', 'disetujui', 'ditolak', 'selesai'))
);

CREATE INDEX IF NOT EXISTS "idx_aktivitas_mbkm_status_log_aktivitas" ON "aktivitas_mbkm_status_log" ("aktivitas_id");
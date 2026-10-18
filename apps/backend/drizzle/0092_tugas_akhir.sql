-- Modul Tugas Akhir / Skripsi Vokasi
-- Idempoten: aman dijalankan berulang.

CREATE TABLE IF NOT EXISTS "tugas_akhir" (
  "id" serial PRIMARY KEY NOT NULL,
  "kode_ta" varchar(50) NOT NULL,
  "tipe" varchar(20) DEFAULT 'individu' NOT NULL,
  "jenis_karya" varchar(50) DEFAULT 'skripsi' NOT NULL,
  "judul" text NOT NULL,
  "judul_inggris" text,
  "bidang_kajian" varchar(100),
  "latar_belakang" text,
  "rumusan_masalah" text,
  "tujuan" text,
  "metodologi" text,
  "mitra_industri" varchar(255),
  "program_studi_id" integer NOT NULL REFERENCES "program_studi"("id") ON DELETE RESTRICT,
  "periode_id" varchar(5) REFERENCES "periode_akademik"("id") ON DELETE SET NULL,
  "status" varchar(40) DEFAULT 'draft' NOT NULL,
  "created_by_id" integer NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "disetujui_oleh_id" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "disetujui_at" timestamp,
  "catatan_prodi" text,
  "file_proposal_topik_url" text,
  "file_laporan_final_url" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "tugas_akhir_kode_ta_unique" UNIQUE ("kode_ta")
);

CREATE INDEX IF NOT EXISTS "idx_tugas_akhir_status" ON "tugas_akhir" ("status");
CREATE INDEX IF NOT EXISTS "idx_tugas_akhir_prodi" ON "tugas_akhir" ("program_studi_id");
CREATE INDEX IF NOT EXISTS "idx_tugas_akhir_periode" ON "tugas_akhir" ("periode_id");
CREATE INDEX IF NOT EXISTS "idx_tugas_akhir_created_by" ON "tugas_akhir" ("created_by_id");

CREATE TABLE IF NOT EXISTS "tugas_akhir_anggota" (
  "id" serial PRIMARY KEY NOT NULL,
  "tugas_akhir_id" integer NOT NULL REFERENCES "tugas_akhir"("id") ON DELETE CASCADE,
  "mahasiswa_id" integer NOT NULL REFERENCES "mahasiswa"("id") ON DELETE CASCADE,
  "peran" varchar(20) DEFAULT 'anggota' NOT NULL,
  "status_konfirmasi" varchar(20) DEFAULT 'menunggu' NOT NULL,
  "bagian_pengerjaan" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "tugas_akhir_anggota_unique" UNIQUE ("tugas_akhir_id", "mahasiswa_id")
);

CREATE INDEX IF NOT EXISTS "idx_tugas_akhir_anggota_mhs" ON "tugas_akhir_anggota" ("mahasiswa_id");

CREATE TABLE IF NOT EXISTS "tugas_akhir_pembimbing" (
  "id" serial PRIMARY KEY NOT NULL,
  "tugas_akhir_id" integer NOT NULL REFERENCES "tugas_akhir"("id") ON DELETE CASCADE,
  "dosen_id" integer REFERENCES "dosen"("id") ON DELETE SET NULL,
  "nama_eksternal" varchar(100),
  "instansi_eksternal" varchar(255),
  "peran" varchar(20) NOT NULL,
  "status_persetujuan" varchar(20) DEFAULT 'usulan' NOT NULL,
  "catatan" text,
  "acc_sidang_proposal" boolean DEFAULT false NOT NULL,
  "acc_sidang_proposal_at" timestamp,
  "acc_sidang_akhir" boolean DEFAULT false NOT NULL,
  "acc_sidang_akhir_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "tugas_akhir_pembimbing_peran_unq" UNIQUE ("tugas_akhir_id", "peran")
);

CREATE INDEX IF NOT EXISTS "idx_tugas_akhir_pembimbing_dosen" ON "tugas_akhir_pembimbing" ("dosen_id");

CREATE TABLE IF NOT EXISTS "tugas_akhir_status_log" (
  "id" serial PRIMARY KEY NOT NULL,
  "tugas_akhir_id" integer NOT NULL REFERENCES "tugas_akhir"("id") ON DELETE CASCADE,
  "dari_status" varchar(40),
  "ke_status" varchar(40) NOT NULL,
  "alasan" text NOT NULL,
  "oleh_user_id" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_tugas_akhir_status_log_ta" ON "tugas_akhir_status_log" ("tugas_akhir_id");

CREATE TABLE IF NOT EXISTS "tugas_akhir_logbook" (
  "id" serial PRIMARY KEY NOT NULL,
  "tugas_akhir_id" integer NOT NULL REFERENCES "tugas_akhir"("id") ON DELETE CASCADE,
  "mahasiswa_id" integer NOT NULL REFERENCES "mahasiswa"("id") ON DELETE CASCADE,
  "dosen_id" integer REFERENCES "dosen"("id") ON DELETE SET NULL,
  "pertemuan_ke" integer NOT NULL,
  "tanggal_bimbingan" date NOT NULL,
  "topik" text NOT NULL,
  "deskripsi_kemajuan" text NOT NULL,
  "kendala" text,
  "catatan_dosen" text,
  "status_bimbingan" varchar(20) DEFAULT 'menunggu' NOT NULL,
  "file_draft_url" text,
  "file_revisi_url" text,
  "status_bkd" boolean DEFAULT true NOT NULL,
  "bimbingan_id" integer REFERENCES "bimbingan"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_ta_logbook_ta" ON "tugas_akhir_logbook" ("tugas_akhir_id");
CREATE INDEX IF NOT EXISTS "idx_ta_logbook_dosen" ON "tugas_akhir_logbook" ("dosen_id");
CREATE INDEX IF NOT EXISTS "idx_ta_logbook_mhs" ON "tugas_akhir_logbook" ("mahasiswa_id");

CREATE TABLE IF NOT EXISTS "tugas_akhir_sidang" (
  "id" serial PRIMARY KEY NOT NULL,
  "tugas_akhir_id" integer NOT NULL REFERENCES "tugas_akhir"("id") ON DELETE CASCADE,
  "jenis_sidang" varchar(20) NOT NULL,
  "periode_id" varchar(5) REFERENCES "periode_akademik"("id") ON DELETE SET NULL,
  "tanggal_pengajuan" date,
  "status" varchar(30) DEFAULT 'diajukan' NOT NULL,
  "berkas_syarat" jsonb,
  "tanggal_sidang" date,
  "jam_mulai" varchar(10),
  "jam_selesai" varchar(10),
  "ruangan" varchar(100),
  "status_hasil" varchar(30) DEFAULT 'menunggu' NOT NULL,
  "nilai_akhir_angka" numeric(5, 2),
  "nilai_akhir_huruf" varchar(5),
  "batas_waktu_revisi" date,
  "status_revisi" varchar(30) DEFAULT 'belum_selesai' NOT NULL,
  "catatan_sidang" text,
  "berita_acara_signature_id" integer REFERENCES "document_signatures"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_ta_sidang_ta" ON "tugas_akhir_sidang" ("tugas_akhir_id");
CREATE INDEX IF NOT EXISTS "idx_ta_sidang_status" ON "tugas_akhir_sidang" ("status");
CREATE INDEX IF NOT EXISTS "idx_ta_sidang_tanggal" ON "tugas_akhir_sidang" ("tanggal_sidang");

CREATE TABLE IF NOT EXISTS "tugas_akhir_penguji" (
  "id" serial PRIMARY KEY NOT NULL,
  "sidang_id" integer NOT NULL REFERENCES "tugas_akhir_sidang"("id") ON DELETE CASCADE,
  "dosen_id" integer NOT NULL REFERENCES "dosen"("id") ON DELETE CASCADE,
  "peran_penguji" varchar(30) NOT NULL,
  "kehadiran" boolean DEFAULT false NOT NULL,
  "nilai_total" numeric(5, 2),
  "catatan_revisi" text,
  "status_acc_revisi" boolean DEFAULT false NOT NULL,
  "acc_revisi_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "ta_sidang_penguji_dosen_unq" UNIQUE ("sidang_id", "dosen_id")
);

CREATE INDEX IF NOT EXISTS "idx_ta_penguji_dosen" ON "tugas_akhir_penguji" ("dosen_id");

CREATE TABLE IF NOT EXISTS "tugas_akhir_rubrik_kriteria" (
  "id" serial PRIMARY KEY NOT NULL,
  "program_studi_id" integer REFERENCES "program_studi"("id") ON DELETE CASCADE,
  "jenis_sidang" varchar(20) NOT NULL,
  "kode" varchar(20) NOT NULL,
  "nama" varchar(150) NOT NULL,
  "deskripsi" text,
  "bobot" integer NOT NULL,
  "is_individu" boolean DEFAULT false NOT NULL,
  "urutan" integer DEFAULT 0 NOT NULL,
  "is_aktif" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_ta_rubrik_prodi" ON "tugas_akhir_rubrik_kriteria" ("program_studi_id");
CREATE INDEX IF NOT EXISTS "idx_ta_rubrik_jenis" ON "tugas_akhir_rubrik_kriteria" ("jenis_sidang");

CREATE TABLE IF NOT EXISTS "tugas_akhir_nilai_detail" (
  "id" serial PRIMARY KEY NOT NULL,
  "penguji_id" integer NOT NULL REFERENCES "tugas_akhir_penguji"("id") ON DELETE CASCADE,
  "mahasiswa_id" integer NOT NULL REFERENCES "mahasiswa"("id") ON DELETE CASCADE,
  "kriteria_id" integer NOT NULL REFERENCES "tugas_akhir_rubrik_kriteria"("id") ON DELETE RESTRICT,
  "nilai" numeric(5, 2) NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "ta_nilai_penguji_mhs_kriteria_unq" UNIQUE ("penguji_id", "mahasiswa_id", "kriteria_id")
);

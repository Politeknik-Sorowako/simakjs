
CREATE TABLE IF NOT EXISTS "konversi_nilai" (
	"id" serial PRIMARY KEY NOT NULL,
	"program_studi_id" integer,
	"nilai_huruf" varchar(5) NOT NULL,
	"bobot_indeks" numeric(3, 2) NOT NULL,
	"nilai_min" numeric(5, 2) NOT NULL,
	"nilai_max" numeric(5, 2) NOT NULL,
	"predikat" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "kurikulum" (
	"id" serial PRIMARY KEY NOT NULL,
	"kode" varchar(50) NOT NULL,
	"nama" varchar(255) NOT NULL,
	"program_studi_id" integer NOT NULL,
	"semester_mulai" varchar(5) NOT NULL,
	"jumlah_sks_lulus" integer NOT NULL,
	"jumlah_sks_wajib" integer NOT NULL,
	"jumlah_sks_pilihan" integer NOT NULL,
	"is_aktif" boolean DEFAULT false NOT NULL,
	"id_pddikti" varchar(50),
	"is_synced" boolean DEFAULT false NOT NULL,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "kurikulum_kode_unique" UNIQUE("kode"),
	CONSTRAINT "kurikulum_id_pddikti_unique" UNIQUE("id_pddikti")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "kurikulum_mata_kuliah" (
	"id" serial PRIMARY KEY NOT NULL,
	"kurikulum_id" integer NOT NULL,
	"mata_kuliah_id" integer NOT NULL,
	"semester" integer NOT NULL,
	"sks_mata_kuliah" integer NOT NULL,
	"sks_tatap_muka" integer,
	"sks_praktek" integer,
	"sks_praktek_lapangan" integer DEFAULT 0,
	"sks_simulasi" integer DEFAULT 0,
	"is_wajib" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "password_resets" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "password_resets_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rencana_evaluasi" (
	"id" serial PRIMARY KEY NOT NULL,
	"mata_kuliah_id" integer NOT NULL,
	"nama_evaluasi" varchar(100) NOT NULL,
	"bobot_evaluasi" numeric(5, 2) NOT NULL,
	"deskripsi" text,
	"id_pddikti" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rencana_evaluasi_id_pddikti_unique" UNIQUE("id_pddikti")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rps" (
	"id" serial PRIMARY KEY NOT NULL,
	"mata_kuliah_id" integer NOT NULL,
	"periode_id" varchar(5) NOT NULL,
	"deskripsi" text,
	"cpl_prodi" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rps_topik" (
	"id" serial PRIMARY KEY NOT NULL,
	"rps_id" integer NOT NULL,
	"pertemuan_ke" integer NOT NULL,
	"topik" varchar(255) NOT NULL,
	"sub_topik" text,
	"metode" varchar(100),
	"cpmk_id" integer,
	"id_pddikti" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rps_topik_id_pddikti_unique" UNIQUE("id_pddikti")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "skala_predikat_kelulusan" (
	"id" serial PRIMARY KEY NOT NULL,
	"ipk_min" numeric(3, 2) NOT NULL,
	"ipk_max" numeric(3, 2) NOT NULL,
	"predikat" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "skema_tarif" (
	"id" serial PRIMARY KEY NOT NULL,
	"angkatan" varchar(4) NOT NULL,
	"program_studi_id" integer NOT NULL,
	"nominal" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transaksi_pembayaran" (
	"id" serial PRIMARY KEY NOT NULL,
	"tagihan_id" integer NOT NULL,
	"nominal_bayar" integer NOT NULL,
	"tanggal_transaksi" timestamp DEFAULT now() NOT NULL,
	"petugas_id" integer,
	"is_void" boolean DEFAULT false NOT NULL,
	"catatan_koreksi" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bimbingan" ADD COLUMN "permasalahan" text;--> statement-breakpoint
ALTER TABLE "bimbingan" ADD COLUMN "solusi" text;--> statement-breakpoint
ALTER TABLE "bimbingan" ADD COLUMN "tanggal_bimbingan" date;--> statement-breakpoint
ALTER TABLE "bimbingan" ADD COLUMN "status_bkd" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "bimbingan_thread" ADD COLUMN "tipe" varchar(10) DEFAULT 'uts' NOT NULL;--> statement-breakpoint
ALTER TABLE "dosen" ADD COLUMN "tempat_lahir" varchar(100);--> statement-breakpoint
ALTER TABLE "dosen" ADD COLUMN "id_agama" integer;--> statement-breakpoint
ALTER TABLE "kelas_kuliah" ADD COLUMN "tanggal_mulai_efektif" date;--> statement-breakpoint
ALTER TABLE "kelas_kuliah" ADD COLUMN "tanggal_akhir_efektif" date;--> statement-breakpoint
ALTER TABLE "mahasiswa" ADD COLUMN "tempat_lahir" varchar(100);--> statement-breakpoint
ALTER TABLE "mahasiswa" ADD COLUMN "id_agama" integer;--> statement-breakpoint
ALTER TABLE "mahasiswa" ADD COLUMN "jalan" text;--> statement-breakpoint
ALTER TABLE "mahasiswa" ADD COLUMN "rt" varchar(5);--> statement-breakpoint
ALTER TABLE "mahasiswa" ADD COLUMN "rw" varchar(5);--> statement-breakpoint
ALTER TABLE "mahasiswa" ADD COLUMN "kode_pos" varchar(10);--> statement-breakpoint
ALTER TABLE "mahasiswa" ADD COLUMN "kewarganegaraan" varchar(5) DEFAULT 'ID';--> statement-breakpoint
ALTER TABLE "mata_kuliah" ADD COLUMN "sks_praktek_lapangan" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "mata_kuliah" ADD COLUMN "sks_simulasi" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "tagihan" ADD COLUMN "nominal_terbayar" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "nama" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_active" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "theme" varchar(20) DEFAULT 'light' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "konversi_nilai" ADD CONSTRAINT "konversi_nilai_program_studi_id_program_studi_id_fk" FOREIGN KEY ("program_studi_id") REFERENCES "public"."program_studi"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kurikulum" ADD CONSTRAINT "kurikulum_program_studi_id_program_studi_id_fk" FOREIGN KEY ("program_studi_id") REFERENCES "public"."program_studi"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kurikulum" ADD CONSTRAINT "kurikulum_semester_mulai_periode_akademik_id_fk" FOREIGN KEY ("semester_mulai") REFERENCES "public"."periode_akademik"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kurikulum_mata_kuliah" ADD CONSTRAINT "kurikulum_mata_kuliah_kurikulum_id_kurikulum_id_fk" FOREIGN KEY ("kurikulum_id") REFERENCES "public"."kurikulum"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kurikulum_mata_kuliah" ADD CONSTRAINT "kurikulum_mata_kuliah_mata_kuliah_id_mata_kuliah_id_fk" FOREIGN KEY ("mata_kuliah_id") REFERENCES "public"."mata_kuliah"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rencana_evaluasi" ADD CONSTRAINT "rencana_evaluasi_mata_kuliah_id_mata_kuliah_id_fk" FOREIGN KEY ("mata_kuliah_id") REFERENCES "public"."mata_kuliah"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rps" ADD CONSTRAINT "rps_mata_kuliah_id_mata_kuliah_id_fk" FOREIGN KEY ("mata_kuliah_id") REFERENCES "public"."mata_kuliah"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rps" ADD CONSTRAINT "rps_periode_id_periode_akademik_id_fk" FOREIGN KEY ("periode_id") REFERENCES "public"."periode_akademik"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rps_topik" ADD CONSTRAINT "rps_topik_rps_id_rps_id_fk" FOREIGN KEY ("rps_id") REFERENCES "public"."rps"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rps_topik" ADD CONSTRAINT "rps_topik_cpmk_id_cpmk_id_fk" FOREIGN KEY ("cpmk_id") REFERENCES "public"."cpmk"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "skema_tarif" ADD CONSTRAINT "skema_tarif_program_studi_id_program_studi_id_fk" FOREIGN KEY ("program_studi_id") REFERENCES "public"."program_studi"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transaksi_pembayaran" ADD CONSTRAINT "transaksi_pembayaran_tagihan_id_tagihan_id_fk" FOREIGN KEY ("tagihan_id") REFERENCES "public"."tagihan"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transaksi_pembayaran" ADD CONSTRAINT "transaksi_pembayaran_petugas_id_users_id_fk" FOREIGN KEY ("petugas_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

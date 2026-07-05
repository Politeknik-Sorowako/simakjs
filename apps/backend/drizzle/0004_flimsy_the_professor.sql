DO $$ BEGIN
 CREATE TYPE "public"."presensi_status" AS ENUM('hadir', 'sakit', 'izin', 'telat', 'alpa');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."tagihan_status" AS ENUM('belum_bayar', 'cicilan', 'lunas');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bap" (
	"id" serial PRIMARY KEY NOT NULL,
	"kelas_kuliah_id" integer NOT NULL,
	"tanggal" date NOT NULL,
	"pertemuan_ke" integer NOT NULL,
	"materi" text NOT NULL,
	"durasi_menit" integer NOT NULL,
	"cpmk_id" integer NOT NULL,
	"dosen_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bimbingan" (
	"id" serial PRIMARY KEY NOT NULL,
	"mahasiswa_id" integer NOT NULL,
	"dosen_id" integer,
	"periode_id" varchar(5) NOT NULL,
	"ringkasan" text,
	"is_approved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bimbingan_thread" (
	"id" serial PRIMARY KEY NOT NULL,
	"bimbingan_id" integer NOT NULL,
	"sender_role" "user_role" NOT NULL,
	"pesan" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cpmk" (
	"id" serial PRIMARY KEY NOT NULL,
	"mata_kuliah_id" integer NOT NULL,
	"kode" varchar(50) NOT NULL,
	"deskripsi" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "kompensasi_bayar" (
	"id" serial PRIMARY KEY NOT NULL,
	"mahasiswa_id" integer NOT NULL,
	"jumlah_menit" integer NOT NULL,
	"tanggal" date NOT NULL,
	"keterangan" text NOT NULL,
	"petugas_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pelanggaran" (
	"id" serial PRIMARY KEY NOT NULL,
	"mahasiswa_id" integer NOT NULL,
	"tanggal" date NOT NULL,
	"jenis_pelanggaran" varchar(255) NOT NULL,
	"bobot_poin" integer NOT NULL,
	"keterangan" text NOT NULL,
	"dibuat_oleh" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "presensi" (
	"id" serial PRIMARY KEY NOT NULL,
	"bap_id" integer NOT NULL,
	"mahasiswa_id" integer NOT NULL,
	"status" "presensi_status" NOT NULL,
	"durasi_mangkir" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tagihan" (
	"id" serial PRIMARY KEY NOT NULL,
	"mahasiswa_id" integer NOT NULL,
	"periode_id" varchar(5) NOT NULL,
	"nominal" integer NOT NULL,
	"status" "tagihan_status" DEFAULT 'belum_bayar' NOT NULL,
	"tanggal_bayar" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "krs" ADD COLUMN "is_approved" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "krs" ADD COLUMN "approved_by_id" integer;--> statement-breakpoint
ALTER TABLE "krs" ADD COLUMN "approved_at" timestamp;--> statement-breakpoint
ALTER TABLE "mahasiswa" ADD COLUMN "dosen_pa_id" integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bap" ADD CONSTRAINT "bap_kelas_kuliah_id_kelas_kuliah_id_fk" FOREIGN KEY ("kelas_kuliah_id") REFERENCES "public"."kelas_kuliah"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bap" ADD CONSTRAINT "bap_cpmk_id_cpmk_id_fk" FOREIGN KEY ("cpmk_id") REFERENCES "public"."cpmk"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bap" ADD CONSTRAINT "bap_dosen_id_dosen_id_fk" FOREIGN KEY ("dosen_id") REFERENCES "public"."dosen"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bimbingan" ADD CONSTRAINT "bimbingan_mahasiswa_id_mahasiswa_id_fk" FOREIGN KEY ("mahasiswa_id") REFERENCES "public"."mahasiswa"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bimbingan" ADD CONSTRAINT "bimbingan_dosen_id_dosen_id_fk" FOREIGN KEY ("dosen_id") REFERENCES "public"."dosen"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bimbingan" ADD CONSTRAINT "bimbingan_periode_id_periode_akademik_id_fk" FOREIGN KEY ("periode_id") REFERENCES "public"."periode_akademik"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bimbingan_thread" ADD CONSTRAINT "bimbingan_thread_bimbingan_id_bimbingan_id_fk" FOREIGN KEY ("bimbingan_id") REFERENCES "public"."bimbingan"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cpmk" ADD CONSTRAINT "cpmk_mata_kuliah_id_mata_kuliah_id_fk" FOREIGN KEY ("mata_kuliah_id") REFERENCES "public"."mata_kuliah"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kompensasi_bayar" ADD CONSTRAINT "kompensasi_bayar_mahasiswa_id_mahasiswa_id_fk" FOREIGN KEY ("mahasiswa_id") REFERENCES "public"."mahasiswa"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kompensasi_bayar" ADD CONSTRAINT "kompensasi_bayar_petugas_id_users_id_fk" FOREIGN KEY ("petugas_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pelanggaran" ADD CONSTRAINT "pelanggaran_mahasiswa_id_mahasiswa_id_fk" FOREIGN KEY ("mahasiswa_id") REFERENCES "public"."mahasiswa"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pelanggaran" ADD CONSTRAINT "pelanggaran_dibuat_oleh_users_id_fk" FOREIGN KEY ("dibuat_oleh") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "presensi" ADD CONSTRAINT "presensi_bap_id_bap_id_fk" FOREIGN KEY ("bap_id") REFERENCES "public"."bap"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "presensi" ADD CONSTRAINT "presensi_mahasiswa_id_mahasiswa_id_fk" FOREIGN KEY ("mahasiswa_id") REFERENCES "public"."mahasiswa"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tagihan" ADD CONSTRAINT "tagihan_mahasiswa_id_mahasiswa_id_fk" FOREIGN KEY ("mahasiswa_id") REFERENCES "public"."mahasiswa"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tagihan" ADD CONSTRAINT "tagihan_periode_id_periode_akademik_id_fk" FOREIGN KEY ("periode_id") REFERENCES "public"."periode_akademik"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "krs" ADD CONSTRAINT "krs_approved_by_id_dosen_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."dosen"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mahasiswa" ADD CONSTRAINT "mahasiswa_dosen_pa_id_dosen_id_fk" FOREIGN KEY ("dosen_pa_id") REFERENCES "public"."dosen"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

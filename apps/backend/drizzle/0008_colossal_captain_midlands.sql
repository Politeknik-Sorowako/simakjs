CREATE TABLE IF NOT EXISTS "mahasiswa_keluar" (
	"id" serial PRIMARY KEY NOT NULL,
	"mahasiswa_id" integer NOT NULL,
	"periode_id" varchar(5) NOT NULL,
	"status_baru" varchar(50) NOT NULL,
	"tanggal_keluar" date NOT NULL,
	"alasan_keluar" text,
	"no_sk_yudisium" varchar(100),
	"tanggal_sk_yudisium" date,
	"ipk" numeric(3, 2),
	"nomor_ijazah" varchar(100),
	"id_pddikti" varchar(50),
	"is_synced" boolean DEFAULT false NOT NULL,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "mahasiswa_keluar_id_pddikti_unique" UNIQUE("id_pddikti")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pengajuan_cuti" (
	"id" serial PRIMARY KEY NOT NULL,
	"mahasiswa_id" integer NOT NULL,
	"periode_id" varchar(5) NOT NULL,
	"alasan" text NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"catatan" text,
	"no_surat_izin_cuti" varchar(100),
	"tgl_surat_izin_cuti" date,
	"id_pddikti" varchar(50),
	"is_synced" boolean DEFAULT false NOT NULL,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pengajuan_cuti_id_pddikti_unique" UNIQUE("id_pddikti")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sesi_bimbingan" (
	"id" serial PRIMARY KEY NOT NULL,
	"bimbingan_id" integer NOT NULL,
	"pertemuan_ke" integer NOT NULL,
	"tanggal_bimbingan" date NOT NULL,
	"permasalahan" text NOT NULL,
	"solusi" text NOT NULL,
	"status_bkd" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "konversi_nilai" DROP CONSTRAINT "konversi_nilai_program_studi_id_program_studi_id_fk";
--> statement-breakpoint
ALTER TABLE "skema_tarif" DROP CONSTRAINT "skema_tarif_program_studi_id_program_studi_id_fk";
--> statement-breakpoint
ALTER TABLE "mahasiswa" ADD COLUMN "angkatan" varchar(4);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mahasiswa_keluar" ADD CONSTRAINT "mahasiswa_keluar_mahasiswa_id_mahasiswa_id_fk" FOREIGN KEY ("mahasiswa_id") REFERENCES "public"."mahasiswa"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mahasiswa_keluar" ADD CONSTRAINT "mahasiswa_keluar_periode_id_periode_akademik_id_fk" FOREIGN KEY ("periode_id") REFERENCES "public"."periode_akademik"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pengajuan_cuti" ADD CONSTRAINT "pengajuan_cuti_mahasiswa_id_mahasiswa_id_fk" FOREIGN KEY ("mahasiswa_id") REFERENCES "public"."mahasiswa"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pengajuan_cuti" ADD CONSTRAINT "pengajuan_cuti_periode_id_periode_akademik_id_fk" FOREIGN KEY ("periode_id") REFERENCES "public"."periode_akademik"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sesi_bimbingan" ADD CONSTRAINT "sesi_bimbingan_bimbingan_id_bimbingan_id_fk" FOREIGN KEY ("bimbingan_id") REFERENCES "public"."bimbingan"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "konversi_nilai" ADD CONSTRAINT "konversi_nilai_program_studi_id_program_studi_id_fk" FOREIGN KEY ("program_studi_id") REFERENCES "public"."program_studi"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "skema_tarif" ADD CONSTRAINT "skema_tarif_program_studi_id_program_studi_id_fk" FOREIGN KEY ("program_studi_id") REFERENCES "public"."program_studi"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "skema_tarif" ADD CONSTRAINT "skema_tarif_angkatan_prodi_unique" UNIQUE("angkatan","program_studi_id");
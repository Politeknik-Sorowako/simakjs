CREATE TABLE IF NOT EXISTS "komponen_nilai" (
	"id" serial PRIMARY KEY NOT NULL,
	"kelas_kuliah_id" integer NOT NULL,
	"nama" varchar(100) NOT NULL,
	"bobot" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nilai_komponen_mahasiswa" (
	"id" serial PRIMARY KEY NOT NULL,
	"krs_id" integer NOT NULL,
	"komponen_nilai_id" integer NOT NULL,
	"nilai" numeric(5, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pengajuan_yudisium" (
	"id" serial PRIMARY KEY NOT NULL,
	"mahasiswa_id" integer NOT NULL,
	"bebas_perpustakaan" boolean DEFAULT false NOT NULL,
	"bebas_lab" boolean DEFAULT false NOT NULL,
	"bukti_pembayaran_wisuda" boolean DEFAULT false NOT NULL,
	"skor_toefl" integer DEFAULT 0 NOT NULL,
	"judul_ta" text NOT NULL,
	"status" varchar(20) DEFAULT 'diajukan' NOT NULL,
	"catatan" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pengajuan_yudisium_mahasiswa_id_unique" UNIQUE("mahasiswa_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "komponen_nilai" ADD CONSTRAINT "komponen_nilai_kelas_kuliah_id_kelas_kuliah_id_fk" FOREIGN KEY ("kelas_kuliah_id") REFERENCES "public"."kelas_kuliah"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nilai_komponen_mahasiswa" ADD CONSTRAINT "nilai_komponen_mahasiswa_krs_id_krs_id_fk" FOREIGN KEY ("krs_id") REFERENCES "public"."krs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nilai_komponen_mahasiswa" ADD CONSTRAINT "nilai_komponen_mahasiswa_komponen_nilai_id_komponen_nilai_id_fk" FOREIGN KEY ("komponen_nilai_id") REFERENCES "public"."komponen_nilai"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pengajuan_yudisium" ADD CONSTRAINT "pengajuan_yudisium_mahasiswa_id_mahasiswa_id_fk" FOREIGN KEY ("mahasiswa_id") REFERENCES "public"."mahasiswa"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

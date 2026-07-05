DO $$ BEGIN
 CREATE TYPE "public"."user_role" AS ENUM('admin', 'dosen', 'mahasiswa', 'prodi', 'keuangan', 'guest');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dosen" (
	"id" serial PRIMARY KEY NOT NULL,
	"nip" varchar(50) NOT NULL,
	"nama" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"program_studi_id" integer,
	"id_pddikti" varchar(50),
	"nidn" varchar(50),
	"nik" varchar(16),
	"jenis_kelamin" varchar(1),
	"tanggal_lahir" date,
	CONSTRAINT "dosen_nip_unique" UNIQUE("nip"),
	CONSTRAINT "dosen_email_unique" UNIQUE("email"),
	CONSTRAINT "dosen_nidn_unique" UNIQUE("nidn")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mahasiswa" (
	"id" serial PRIMARY KEY NOT NULL,
	"nim" varchar(50) NOT NULL,
	"nama" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"program_studi_id" integer,
	"status" varchar(50) DEFAULT 'aktif' NOT NULL,
	"id_pddikti" varchar(50),
	"nama_ibu_kandung" varchar(255) NOT NULL,
	"nik" varchar(16) NOT NULL,
	"jenis_kelamin" varchar(1) NOT NULL,
	"tanggal_lahir" date NOT NULL,
	CONSTRAINT "mahasiswa_nim_unique" UNIQUE("nim"),
	CONSTRAINT "mahasiswa_email_unique" UNIQUE("email"),
	CONSTRAINT "mahasiswa_nik_unique" UNIQUE("nik")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "program_studi" (
	"id" serial PRIMARY KEY NOT NULL,
	"kode" varchar(50) NOT NULL,
	"nama" varchar(255) NOT NULL,
	"jenjang" varchar(10) NOT NULL,
	"id_pddikti" varchar(50),
	CONSTRAINT "program_studi_kode_unique" UNIQUE("kode")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" text NOT NULL,
	"role" "user_role" DEFAULT 'mahasiswa' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dosen" ADD CONSTRAINT "dosen_program_studi_id_program_studi_id_fk" FOREIGN KEY ("program_studi_id") REFERENCES "public"."program_studi"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mahasiswa" ADD CONSTRAINT "mahasiswa_program_studi_id_program_studi_id_fk" FOREIGN KEY ("program_studi_id") REFERENCES "public"."program_studi"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

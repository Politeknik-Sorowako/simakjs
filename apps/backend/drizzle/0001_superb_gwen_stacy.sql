CREATE TABLE IF NOT EXISTS "dosen_pengajar_kelas" (
	"id" serial PRIMARY KEY NOT NULL,
	"dosen_id" integer NOT NULL,
	"kelas_kuliah_id" integer NOT NULL,
	"sks_beban_mengajar" integer,
	"id_pddikti" varchar(50)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "kelas_kuliah" (
	"id" serial PRIMARY KEY NOT NULL,
	"mata_kuliah_id" integer NOT NULL,
	"periode_id" varchar(5) NOT NULL,
	"nama_kelas" varchar(50) NOT NULL,
	"id_pddikti" varchar(50)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "krs" (
	"id" serial PRIMARY KEY NOT NULL,
	"mahasiswa_id" integer NOT NULL,
	"kelas_kuliah_id" integer NOT NULL,
	"nilai_angka" numeric(5, 2),
	"nilai_huruf" varchar(5),
	"nilai_indeks" numeric(3, 2),
	"id_pddikti" varchar(50)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mata_kuliah" (
	"id" serial PRIMARY KEY NOT NULL,
	"kode" varchar(50) NOT NULL,
	"nama" varchar(255) NOT NULL,
	"sks_total" integer NOT NULL,
	"sks_tatap_muka" integer,
	"sks_praktek" integer,
	"program_studi_id" integer,
	"id_pddikti" varchar(50),
	CONSTRAINT "mata_kuliah_kode_unique" UNIQUE("kode")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "periode_akademik" (
	"id" varchar(5) PRIMARY KEY NOT NULL,
	"nama" varchar(100) NOT NULL,
	"aktif" boolean DEFAULT false NOT NULL,
	"id_pddikti" varchar(50)
);
--> statement-breakpoint
DO $$ BEGIN
 RAISE NOTICE 'Cleaning orphaned FK rows (dosen_pengajar_kelas/dosen): %', (SELECT count(*) FROM "dosen_pengajar_kelas" WHERE "dosen_id" IS NOT NULL AND "dosen_id" NOT IN (SELECT "id" FROM "dosen"));
 DELETE FROM "dosen_pengajar_kelas" WHERE "dosen_id" IS NOT NULL AND "dosen_id" NOT IN (SELECT "id" FROM "dosen");
 RAISE NOTICE 'Cleaning orphaned FK rows (dosen_pengajar_kelas/kelas_kuliah): %', (SELECT count(*) FROM "dosen_pengajar_kelas" WHERE "kelas_kuliah_id" IS NOT NULL AND "kelas_kuliah_id" NOT IN (SELECT "id" FROM "kelas_kuliah"));
 DELETE FROM "dosen_pengajar_kelas" WHERE "kelas_kuliah_id" IS NOT NULL AND "kelas_kuliah_id" NOT IN (SELECT "id" FROM "kelas_kuliah");
 RAISE NOTICE 'Cleaning orphaned FK rows (kelas_kuliah/mata_kuliah): %', (SELECT count(*) FROM "kelas_kuliah" WHERE "mata_kuliah_id" IS NOT NULL AND "mata_kuliah_id" NOT IN (SELECT "id" FROM "mata_kuliah"));
 DELETE FROM "kelas_kuliah" WHERE "mata_kuliah_id" IS NOT NULL AND "mata_kuliah_id" NOT IN (SELECT "id" FROM "mata_kuliah");
 RAISE NOTICE 'Cleaning orphaned FK rows (kelas_kuliah/periode_akademik): %', (SELECT count(*) FROM "kelas_kuliah" WHERE "periode_id" IS NOT NULL AND "periode_id" NOT IN (SELECT "id" FROM "periode_akademik"));
 DELETE FROM "kelas_kuliah" WHERE "periode_id" IS NOT NULL AND "periode_id" NOT IN (SELECT "id" FROM "periode_akademik");
 RAISE NOTICE 'Cleaning orphaned FK rows (krs/mahasiswa): %', (SELECT count(*) FROM "krs" WHERE "mahasiswa_id" IS NOT NULL AND "mahasiswa_id" NOT IN (SELECT "id" FROM "mahasiswa"));
 DELETE FROM "krs" WHERE "mahasiswa_id" IS NOT NULL AND "mahasiswa_id" NOT IN (SELECT "id" FROM "mahasiswa");
 RAISE NOTICE 'Cleaning orphaned FK rows (krs/kelas_kuliah): %', (SELECT count(*) FROM "krs" WHERE "kelas_kuliah_id" IS NOT NULL AND "kelas_kuliah_id" NOT IN (SELECT "id" FROM "kelas_kuliah"));
 DELETE FROM "krs" WHERE "kelas_kuliah_id" IS NOT NULL AND "kelas_kuliah_id" NOT IN (SELECT "id" FROM "kelas_kuliah");
 RAISE NOTICE 'Cleaning orphaned FK rows (mata_kuliah/program_studi): %', (SELECT count(*) FROM "mata_kuliah" WHERE "program_studi_id" IS NOT NULL AND "program_studi_id" NOT IN (SELECT "id" FROM "program_studi"));
 DELETE FROM "mata_kuliah" WHERE "program_studi_id" IS NOT NULL AND "program_studi_id" NOT IN (SELECT "id" FROM "program_studi");
END $$;

DO $$ BEGIN
 ALTER TABLE "dosen_pengajar_kelas" ADD CONSTRAINT "dosen_pengajar_kelas_dosen_id_dosen_id_fk" FOREIGN KEY ("dosen_id") REFERENCES "public"."dosen"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
 WHEN foreign_key_violation THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dosen_pengajar_kelas" ADD CONSTRAINT "dosen_pengajar_kelas_kelas_kuliah_id_kelas_kuliah_id_fk" FOREIGN KEY ("kelas_kuliah_id") REFERENCES "public"."kelas_kuliah"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
 WHEN foreign_key_violation THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kelas_kuliah" ADD CONSTRAINT "kelas_kuliah_mata_kuliah_id_mata_kuliah_id_fk" FOREIGN KEY ("mata_kuliah_id") REFERENCES "public"."mata_kuliah"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
 WHEN foreign_key_violation THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kelas_kuliah" ADD CONSTRAINT "kelas_kuliah_periode_id_periode_akademik_id_fk" FOREIGN KEY ("periode_id") REFERENCES "public"."periode_akademik"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
 WHEN foreign_key_violation THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "krs" ADD CONSTRAINT "krs_mahasiswa_id_mahasiswa_id_fk" FOREIGN KEY ("mahasiswa_id") REFERENCES "public"."mahasiswa"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
 WHEN foreign_key_violation THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "krs" ADD CONSTRAINT "krs_kelas_kuliah_id_kelas_kuliah_id_fk" FOREIGN KEY ("kelas_kuliah_id") REFERENCES "public"."kelas_kuliah"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
 WHEN foreign_key_violation THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mata_kuliah" ADD CONSTRAINT "mata_kuliah_program_studi_id_program_studi_id_fk" FOREIGN KEY ("program_studi_id") REFERENCES "public"."program_studi"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
 WHEN foreign_key_violation THEN null;
END $$;

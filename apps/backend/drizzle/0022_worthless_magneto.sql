ALTER TYPE "public"."presensi_status" ADD VALUE IF NOT EXISTS 'terlambat';--> statement-breakpoint
ALTER TYPE "public"."presensi_status" ADD VALUE IF NOT EXISTS 'unknown';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "kelompok_apel" (
	"id" serial PRIMARY KEY NOT NULL,
	"nama_kelompok" varchar(100) NOT NULL,
	"program_studi_id" integer NOT NULL,
	"dosen_id" integer NOT NULL,
	"shift" varchar(10) DEFAULT 'pagi' NOT NULL,
	"keterangan" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "kelompok_apel_anggota" (
	"id" serial PRIMARY KEY NOT NULL,
	"kelompok_apel_id" integer NOT NULL,
	"mahasiswa_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "kelompok_apel_anggota_unique" UNIQUE("kelompok_apel_id","mahasiswa_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "presensi_apel" (
	"id" serial PRIMARY KEY NOT NULL,
	"sesi_apel_id" integer NOT NULL,
	"mahasiswa_id" integer NOT NULL,
	"status" "presensi_status" DEFAULT 'hadir' NOT NULL,
	"menit_terlambat" integer,
	"verified_status" "presensi_status",
	"verified_by" integer,
	"verified_at" timestamp,
	"verification_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sesi_apel" (
	"id" serial PRIMARY KEY NOT NULL,
	"kelompok_apel_id" integer NOT NULL,
	"tanggal" date NOT NULL,
	"shift" varchar(10) NOT NULL,
	"dosen_id" integer NOT NULL,
	"jam_mulai" time NOT NULL,
	"is_closed" boolean DEFAULT false NOT NULL,
	"closed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mata_kuliah" DROP CONSTRAINT IF EXISTS "mata_kuliah_kode_unique";--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'mata_kuliah' AND column_name = 'program_studi_id') THEN
    ALTER TABLE "mata_kuliah" ADD COLUMN "program_studi_id" integer NOT NULL;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'kelompok_apel_program_studi_id_program_studi_id_fk') THEN
    ALTER TABLE "kelompok_apel" ADD CONSTRAINT "kelompok_apel_program_studi_id_program_studi_id_fk" FOREIGN KEY ("program_studi_id") REFERENCES "public"."program_studi"("id") ON DELETE restrict ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'kelompok_apel_dosen_id_dosen_id_fk') THEN
    ALTER TABLE "kelompok_apel" ADD CONSTRAINT "kelompok_apel_dosen_id_dosen_id_fk" FOREIGN KEY ("dosen_id") REFERENCES "public"."dosen"("id") ON DELETE restrict ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'kelompok_apel_anggota_kelompok_apel_id_kelompok_apel_id_fk') THEN
    ALTER TABLE "kelompok_apel_anggota" ADD CONSTRAINT "kelompok_apel_anggota_kelompok_apel_id_kelompok_apel_id_fk" FOREIGN KEY ("kelompok_apel_id") REFERENCES "public"."kelompok_apel"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'kelompok_apel_anggota_mahasiswa_id_mahasiswa_id_fk') THEN
    ALTER TABLE "kelompok_apel_anggota" ADD CONSTRAINT "kelompok_apel_anggota_mahasiswa_id_mahasiswa_id_fk" FOREIGN KEY ("mahasiswa_id") REFERENCES "public"."mahasiswa"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'presensi_apel_sesi_apel_id_sesi_apel_id_fk') THEN
    ALTER TABLE "presensi_apel" ADD CONSTRAINT "presensi_apel_sesi_apel_id_sesi_apel_id_fk" FOREIGN KEY ("sesi_apel_id") REFERENCES "public"."sesi_apel"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'presensi_apel_mahasiswa_id_mahasiswa_id_fk') THEN
    ALTER TABLE "presensi_apel" ADD CONSTRAINT "presensi_apel_mahasiswa_id_mahasiswa_id_fk" FOREIGN KEY ("mahasiswa_id") REFERENCES "public"."mahasiswa"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'presensi_apel_verified_by_users_id_fk') THEN
    ALTER TABLE "presensi_apel" ADD CONSTRAINT "presensi_apel_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sesi_apel_kelompok_apel_id_kelompok_apel_id_fk') THEN
    ALTER TABLE "sesi_apel" ADD CONSTRAINT "sesi_apel_kelompok_apel_id_kelompok_apel_id_fk" FOREIGN KEY ("kelompok_apel_id") REFERENCES "public"."kelompok_apel"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sesi_apel_dosen_id_dosen_id_fk') THEN
    ALTER TABLE "sesi_apel" ADD CONSTRAINT "sesi_apel_dosen_id_dosen_id_fk" FOREIGN KEY ("dosen_id") REFERENCES "public"."dosen"("id") ON DELETE restrict ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mata_kuliah_program_studi_id_program_studi_id_fk') THEN
    ALTER TABLE "mata_kuliah" ADD CONSTRAINT "mata_kuliah_program_studi_id_program_studi_id_fk" FOREIGN KEY ("program_studi_id") REFERENCES "public"."program_studi"("id") ON DELETE restrict ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'kurikulum_mata_kuliah_unique') THEN
    ALTER TABLE "kurikulum_mata_kuliah" ADD CONSTRAINT "kurikulum_mata_kuliah_unique" UNIQUE("kurikulum_id","mata_kuliah_id");
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mata_kuliah_prodi_kode_unique') THEN
    ALTER TABLE "mata_kuliah" ADD CONSTRAINT "mata_kuliah_prodi_kode_unique" UNIQUE("program_studi_id","kode");
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_virtual_accounts_va_number_unique') THEN
    ALTER TABLE "payment_virtual_accounts" ADD CONSTRAINT "payment_virtual_accounts_va_number_unique" UNIQUE("va_number");
  END IF;
END $$;
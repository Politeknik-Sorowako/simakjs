DO $$ BEGIN
 CREATE TYPE "public"."jenis_kelamin" AS ENUM('L', 'P');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "dosen" DROP CONSTRAINT IF EXISTS "dosen_program_studi_id_program_studi_id_fk";--> statement-breakpoint
ALTER TABLE "dosen_pengajar_kelas" DROP CONSTRAINT IF EXISTS "dosen_pengajar_kelas_dosen_id_dosen_id_fk";--> statement-breakpoint
ALTER TABLE "kelas_kuliah" DROP CONSTRAINT IF EXISTS "kelas_kuliah_mata_kuliah_id_mata_kuliah_id_fk";--> statement-breakpoint
ALTER TABLE "krs" DROP CONSTRAINT IF EXISTS "krs_mahasiswa_id_mahasiswa_id_fk";--> statement-breakpoint
ALTER TABLE "mahasiswa" DROP CONSTRAINT IF EXISTS "mahasiswa_program_studi_id_program_studi_id_fk";--> statement-breakpoint
ALTER TABLE "mata_kuliah" DROP CONSTRAINT IF EXISTS "mata_kuliah_program_studi_id_program_studi_id_fk";--> statement-breakpoint
ALTER TABLE "dosen" ALTER COLUMN "jenis_kelamin" SET DATA TYPE jenis_kelamin USING jenis_kelamin::text::jenis_kelamin;--> statement-breakpoint
ALTER TABLE "mahasiswa" ALTER COLUMN "jenis_kelamin" SET DATA TYPE jenis_kelamin USING jenis_kelamin::text::jenis_kelamin;--> statement-breakpoint
ALTER TABLE "dosen" ADD COLUMN IF NOT EXISTS "is_synced" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "dosen" ADD COLUMN IF NOT EXISTS "last_sync_at" timestamp;--> statement-breakpoint
ALTER TABLE "dosen" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "dosen" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "dosen_pengajar_kelas" ADD COLUMN IF NOT EXISTS "is_synced" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "dosen_pengajar_kelas" ADD COLUMN IF NOT EXISTS "last_sync_at" timestamp;--> statement-breakpoint
ALTER TABLE "dosen_pengajar_kelas" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "kelas_kuliah" ADD COLUMN IF NOT EXISTS "is_synced" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "kelas_kuliah" ADD COLUMN IF NOT EXISTS "last_sync_at" timestamp;--> statement-breakpoint
ALTER TABLE "kelas_kuliah" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "krs" ADD COLUMN IF NOT EXISTS "is_synced" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "krs" ADD COLUMN IF NOT EXISTS "last_sync_at" timestamp;--> statement-breakpoint
ALTER TABLE "krs" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "mahasiswa" ADD COLUMN IF NOT EXISTS "is_synced" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "mahasiswa" ADD COLUMN IF NOT EXISTS "last_sync_at" timestamp;--> statement-breakpoint
ALTER TABLE "mahasiswa" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "mahasiswa" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "mata_kuliah" ADD COLUMN IF NOT EXISTS "is_synced" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "mata_kuliah" ADD COLUMN IF NOT EXISTS "last_sync_at" timestamp;--> statement-breakpoint
ALTER TABLE "mata_kuliah" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "periode_akademik" ADD COLUMN IF NOT EXISTS "is_synced" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "periode_akademik" ADD COLUMN IF NOT EXISTS "last_sync_at" timestamp;--> statement-breakpoint
ALTER TABLE "periode_akademik" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "program_studi" ADD COLUMN IF NOT EXISTS "is_synced" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "program_studi" ADD COLUMN IF NOT EXISTS "last_sync_at" timestamp;--> statement-breakpoint
ALTER TABLE "program_studi" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "program_studi" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dosen" ADD CONSTRAINT "dosen_program_studi_id_program_studi_id_fk" FOREIGN KEY ("program_studi_id") REFERENCES "public"."program_studi"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dosen_pengajar_kelas" ADD CONSTRAINT "dosen_pengajar_kelas_dosen_id_dosen_id_fk" FOREIGN KEY ("dosen_id") REFERENCES "public"."dosen"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kelas_kuliah" ADD CONSTRAINT "kelas_kuliah_mata_kuliah_id_mata_kuliah_id_fk" FOREIGN KEY ("mata_kuliah_id") REFERENCES "public"."mata_kuliah"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "krs" ADD CONSTRAINT "krs_mahasiswa_id_mahasiswa_id_fk" FOREIGN KEY ("mahasiswa_id") REFERENCES "public"."mahasiswa"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mahasiswa" ADD CONSTRAINT "mahasiswa_program_studi_id_program_studi_id_fk" FOREIGN KEY ("program_studi_id") REFERENCES "public"."program_studi"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mata_kuliah" ADD CONSTRAINT "mata_kuliah_program_studi_id_program_studi_id_fk" FOREIGN KEY ("program_studi_id") REFERENCES "public"."program_studi"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "dosen" ADD CONSTRAINT "dosen_id_pddikti_unique" UNIQUE("id_pddikti");--> statement-breakpoint
ALTER TABLE "dosen_pengajar_kelas" ADD CONSTRAINT "dosen_pengajar_kelas_id_pddikti_unique" UNIQUE("id_pddikti");--> statement-breakpoint
ALTER TABLE "kelas_kuliah" ADD CONSTRAINT "kelas_kuliah_id_pddikti_unique" UNIQUE("id_pddikti");--> statement-breakpoint
ALTER TABLE "krs" ADD CONSTRAINT "krs_id_pddikti_unique" UNIQUE("id_pddikti");--> statement-breakpoint
ALTER TABLE "mahasiswa" ADD CONSTRAINT "mahasiswa_id_pddikti_unique" UNIQUE("id_pddikti");--> statement-breakpoint
ALTER TABLE "mata_kuliah" ADD CONSTRAINT "mata_kuliah_id_pddikti_unique" UNIQUE("id_pddikti");--> statement-breakpoint
ALTER TABLE "periode_akademik" ADD CONSTRAINT "periode_akademik_id_pddikti_unique" UNIQUE("id_pddikti");--> statement-breakpoint
ALTER TABLE "program_studi" ADD CONSTRAINT "program_studi_id_pddikti_unique" UNIQUE("id_pddikti");
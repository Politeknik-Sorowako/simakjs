CREATE TABLE IF NOT EXISTS "kompensasi_manual" (
	"id" serial PRIMARY KEY NOT NULL,
	"mahasiswa_id" integer NOT NULL,
	"tanggal" date NOT NULL,
	"jenis_kompen" varchar(20) NOT NULL,
	"durasi_menit" integer DEFAULT 0 NOT NULL,
	"keterangan" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nilai_praktik" (
	"id" serial PRIMARY KEY NOT NULL,
	"rombel_praktikum_id" integer NOT NULL,
	"mahasiswa_id" integer NOT NULL,
	"komponen_nilai_id" integer,
	"nilai_angka" numeric(5, 2) NOT NULL,
	"keterangan" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'kompensasi_manual_mahasiswa_id_mahasiswa_id_fk'
  ) THEN
    ALTER TABLE "kompensasi_manual" ADD CONSTRAINT "kompensasi_manual_mahasiswa_id_mahasiswa_id_fk" FOREIGN KEY ("mahasiswa_id") REFERENCES "public"."mahasiswa"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'kompensasi_manual_created_by_users_id_fk'
  ) THEN
    ALTER TABLE "kompensasi_manual" ADD CONSTRAINT "kompensasi_manual_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'nilai_praktik_rombel_praktikum_id_rombel_praktikum_id_fk'
  ) THEN
    ALTER TABLE "nilai_praktik" ADD CONSTRAINT "nilai_praktik_rombel_praktikum_id_rombel_praktikum_id_fk" FOREIGN KEY ("rombel_praktikum_id") REFERENCES "public"."rombel_praktikum"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'nilai_praktik_mahasiswa_id_mahasiswa_id_fk'
  ) THEN
    ALTER TABLE "nilai_praktik" ADD CONSTRAINT "nilai_praktik_mahasiswa_id_mahasiswa_id_fk" FOREIGN KEY ("mahasiswa_id") REFERENCES "public"."mahasiswa"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'nilai_praktik_komponen_nilai_id_komponen_nilai_id_fk'
  ) THEN
    ALTER TABLE "nilai_praktik" ADD CONSTRAINT "nilai_praktik_komponen_nilai_id_komponen_nilai_id_fk" FOREIGN KEY ("komponen_nilai_id") REFERENCES "public"."komponen_nilai"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'nilai_praktik_created_by_users_id_fk'
  ) THEN
    ALTER TABLE "nilai_praktik" ADD CONSTRAINT "nilai_praktik_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'nilai_praktik_rombel_mhs_komponen_unique'
  ) THEN
    ALTER TABLE "nilai_praktik" ADD CONSTRAINT "nilai_praktik_rombel_mhs_komponen_unique" UNIQUE ("rombel_praktikum_id","mahasiswa_id","komponen_nilai_id");
  END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_kompensasi_manual_mhs_tgl" ON "kompensasi_manual" USING btree ("mahasiswa_id","tanggal");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_kompensasi_manual_jenis" ON "kompensasi_manual" USING btree ("jenis_kompen");

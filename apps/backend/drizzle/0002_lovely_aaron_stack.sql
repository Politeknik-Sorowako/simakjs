ALTER TABLE "dosen_pengajar_kelas" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "kelas_kuliah" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "krs" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "mata_kuliah" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "periode_akademik" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "krs_mahasiswa_id_idx" ON "krs" ("mahasiswa_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "krs_kelas_kuliah_id_idx" ON "krs" ("kelas_kuliah_id");
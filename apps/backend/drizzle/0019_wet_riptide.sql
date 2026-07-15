-- OBE Phase 3: New tables for assessment
CREATE TABLE "capaian_cpl" (
	"id" serial PRIMARY KEY NOT NULL,
	"mahasiswa_id" integer NOT NULL,
	"cpl_id" integer NOT NULL,
	"kurikulum_id" integer,
	"periode_id" varchar(5),
	"nilai" numeric(5, 2) NOT NULL,
	"predikat" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "capaian_cpmk" (
	"id" serial PRIMARY KEY NOT NULL,
	"mahasiswa_id" integer NOT NULL,
	"cpmk_id" integer NOT NULL,
	"kelas_kuliah_id" integer NOT NULL,
	"kurikulum_id" integer,
	"nilai" numeric(5, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "capaian_cpmk_unique" UNIQUE("mahasiswa_id","cpmk_id","kelas_kuliah_id")
);
--> statement-breakpoint
CREATE TABLE "cpl_mata_kuliah" (
	"id" serial PRIMARY KEY NOT NULL,
	"cpl_id" integer NOT NULL,
	"mata_kuliah_id" integer NOT NULL,
	"bobot" numeric(5, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cpl_mata_kuliah_unique" UNIQUE("cpl_id","mata_kuliah_id")
);
--> statement-breakpoint
CREATE TABLE "evaluasi_kurikulum" (
	"id" serial PRIMARY KEY NOT NULL,
	"kurikulum_id" integer NOT NULL,
	"periode_id" varchar(5),
	"sumber" varchar(50) DEFAULT 'kaprodi' NOT NULL,
	"aspek" varchar(100) NOT NULL,
	"temuan" text NOT NULL,
	"rekomendasi" text,
	"tindak_lanjut" text,
	"status" varchar(20) DEFAULT 'open',
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- New columns
ALTER TABLE "cpmk" ADD COLUMN "bobot_mk" numeric(5, 2);
--> statement-breakpoint
ALTER TABLE "komponen_nilai" ADD COLUMN "sub_cpmk_id" integer;
--> statement-breakpoint
ALTER TABLE "komponen_nilai" ADD COLUMN "rencana_evaluasi_id" integer;
--> statement-breakpoint
ALTER TABLE "rps" ADD COLUMN "evaluasi_dosen" text;
--> statement-breakpoint
-- Foreign keys for new tables
ALTER TABLE "capaian_cpl" ADD CONSTRAINT "capaian_cpl_mahasiswa_id_mahasiswa_id_fk" FOREIGN KEY ("mahasiswa_id") REFERENCES "public"."mahasiswa"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "capaian_cpl" ADD CONSTRAINT "capaian_cpl_cpl_id_cpl_id_fk" FOREIGN KEY ("cpl_id") REFERENCES "public"."cpl"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "capaian_cpl" ADD CONSTRAINT "capaian_cpl_kurikulum_id_kurikulum_id_fk" FOREIGN KEY ("kurikulum_id") REFERENCES "public"."kurikulum"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "capaian_cpl" ADD CONSTRAINT "capaian_cpl_periode_id_periode_akademik_id_fk" FOREIGN KEY ("periode_id") REFERENCES "public"."periode_akademik"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "capaian_cpmk" ADD CONSTRAINT "capaian_cpmk_mahasiswa_id_mahasiswa_id_fk" FOREIGN KEY ("mahasiswa_id") REFERENCES "public"."mahasiswa"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "capaian_cpmk" ADD CONSTRAINT "capaian_cpmk_cpmk_id_cpmk_id_fk" FOREIGN KEY ("cpmk_id") REFERENCES "public"."cpmk"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "capaian_cpmk" ADD CONSTRAINT "capaian_cpmk_kelas_kuliah_id_kelas_kuliah_id_fk" FOREIGN KEY ("kelas_kuliah_id") REFERENCES "public"."kelas_kuliah"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "capaian_cpmk" ADD CONSTRAINT "capaian_cpmk_kurikulum_id_kurikulum_id_fk" FOREIGN KEY ("kurikulum_id") REFERENCES "public"."kurikulum"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "cpl_mata_kuliah" ADD CONSTRAINT "cpl_mata_kuliah_cpl_id_cpl_id_fk" FOREIGN KEY ("cpl_id") REFERENCES "public"."cpl"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "cpl_mata_kuliah" ADD CONSTRAINT "cpl_mata_kuliah_mata_kuliah_id_mata_kuliah_id_fk" FOREIGN KEY ("mata_kuliah_id") REFERENCES "public"."mata_kuliah"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "evaluasi_kurikulum" ADD CONSTRAINT "evaluasi_kurikulum_kurikulum_id_kurikulum_id_fk" FOREIGN KEY ("kurikulum_id") REFERENCES "public"."kurikulum"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "evaluasi_kurikulum" ADD CONSTRAINT "evaluasi_kurikulum_periode_id_periode_akademik_id_fk" FOREIGN KEY ("periode_id") REFERENCES "public"."periode_akademik"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "evaluasi_kurikulum" ADD CONSTRAINT "evaluasi_kurikulum_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
-- Foreign keys for new columns
ALTER TABLE "komponen_nilai" ADD CONSTRAINT "komponen_nilai_sub_cpmk_id_sub_cpmk_id_fk" FOREIGN KEY ("sub_cpmk_id") REFERENCES "public"."sub_cpmk"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "komponen_nilai" ADD CONSTRAINT "komponen_nilai_rencana_evaluasi_id_rencana_evaluasi_id_fk" FOREIGN KEY ("rencana_evaluasi_id") REFERENCES "public"."rencana_evaluasi"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
-- Indexes for new tables
CREATE INDEX "capaian_cpl_mahasiswa_id_idx" ON "capaian_cpl" USING btree ("mahasiswa_id");
--> statement-breakpoint
CREATE INDEX "capaian_cpl_cpl_id_idx" ON "capaian_cpl" USING btree ("cpl_id");
--> statement-breakpoint
CREATE INDEX "capaian_cpl_kurikulum_id_idx" ON "capaian_cpl" USING btree ("kurikulum_id");
--> statement-breakpoint
CREATE INDEX "capaian_cpmk_mahasiswa_id_idx" ON "capaian_cpmk" USING btree ("mahasiswa_id");
--> statement-breakpoint
CREATE INDEX "capaian_cpmk_cpmk_id_idx" ON "capaian_cpmk" USING btree ("cpmk_id");
--> statement-breakpoint
CREATE INDEX "capaian_cpmk_kelas_kuliah_id_idx" ON "capaian_cpmk" USING btree ("kelas_kuliah_id");
--> statement-breakpoint
CREATE INDEX "cpl_mata_kuliah_cpl_id_idx" ON "cpl_mata_kuliah" USING btree ("cpl_id");
--> statement-breakpoint
CREATE INDEX "cpl_mata_kuliah_mata_kuliah_id_idx" ON "cpl_mata_kuliah" USING btree ("mata_kuliah_id");

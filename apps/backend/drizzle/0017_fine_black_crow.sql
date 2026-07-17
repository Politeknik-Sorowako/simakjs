CREATE TABLE "cpl" (
	"id" serial PRIMARY KEY NOT NULL,
	"program_studi_id" integer NOT NULL,
	"kode" varchar(20) NOT NULL,
	"deskripsi" text NOT NULL,
	"urutan" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cpl_prodi_kode_unique" UNIQUE("program_studi_id","kode")
);
--> statement-breakpoint
CREATE TABLE "cpl_profil_lulusan" (
	"id" serial PRIMARY KEY NOT NULL,
	"cpl_id" integer NOT NULL,
	"profil_lulusan_id" integer NOT NULL,
	"bobot" numeric(5, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cpl_profil_lulusan_unique" UNIQUE("cpl_id","profil_lulusan_id")
);
--> statement-breakpoint
CREATE TABLE "cpmk_cpl" (
	"id" serial PRIMARY KEY NOT NULL,
	"cpmk_id" integer NOT NULL,
	"cpl_id" integer NOT NULL,
	"bobot" numeric(5, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cpmk_cpl_unique" UNIQUE("cpmk_id","cpl_id")
);
--> statement-breakpoint
CREATE TABLE "profil_lulusan" (
	"id" serial PRIMARY KEY NOT NULL,
	"program_studi_id" integer NOT NULL,
	"kode" varchar(20) NOT NULL,
	"deskripsi" text NOT NULL,
	"urutan" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "profil_lulusan_prodi_kode_unique" UNIQUE("program_studi_id","kode")
);
--> statement-breakpoint
CREATE TABLE "sub_cpmk" (
	"id" serial PRIMARY KEY NOT NULL,
	"cpmk_id" integer NOT NULL,
	"kode" varchar(20) NOT NULL,
	"deskripsi" text NOT NULL,
	"urutan" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cpmk" ADD COLUMN "kurikulum_mata_kuliah_id" integer;--> statement-breakpoint
ALTER TABLE "rps_topik" ADD COLUMN "sub_cpmk_id" integer;--> statement-breakpoint
ALTER TABLE "cpl" ADD CONSTRAINT "cpl_program_studi_id_program_studi_id_fk" FOREIGN KEY ("program_studi_id") REFERENCES "public"."program_studi"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cpl_profil_lulusan" ADD CONSTRAINT "cpl_profil_lulusan_cpl_id_cpl_id_fk" FOREIGN KEY ("cpl_id") REFERENCES "public"."cpl"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cpl_profil_lulusan" ADD CONSTRAINT "cpl_profil_lulusan_profil_lulusan_id_profil_lulusan_id_fk" FOREIGN KEY ("profil_lulusan_id") REFERENCES "public"."profil_lulusan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cpmk_cpl" ADD CONSTRAINT "cpmk_cpl_cpmk_id_cpmk_id_fk" FOREIGN KEY ("cpmk_id") REFERENCES "public"."cpmk"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cpmk_cpl" ADD CONSTRAINT "cpmk_cpl_cpl_id_cpl_id_fk" FOREIGN KEY ("cpl_id") REFERENCES "public"."cpl"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profil_lulusan" ADD CONSTRAINT "profil_lulusan_program_studi_id_program_studi_id_fk" FOREIGN KEY ("program_studi_id") REFERENCES "public"."program_studi"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sub_cpmk" ADD CONSTRAINT "sub_cpmk_cpmk_id_cpmk_id_fk" FOREIGN KEY ("cpmk_id") REFERENCES "public"."cpmk"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cpmk" ADD CONSTRAINT "cpmk_kurikulum_mata_kuliah_id_kurikulum_mata_kuliah_id_fk" FOREIGN KEY ("kurikulum_mata_kuliah_id") REFERENCES "public"."kurikulum_mata_kuliah"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rps_topik" ADD CONSTRAINT "rps_topik_sub_cpmk_id_sub_cpmk_id_fk" FOREIGN KEY ("sub_cpmk_id") REFERENCES "public"."sub_cpmk"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cpl_program_studi_id_idx" ON "cpl" ("program_studi_id");--> statement-breakpoint
CREATE INDEX "profil_lulusan_program_studi_id_idx" ON "profil_lulusan" ("program_studi_id");--> statement-breakpoint
CREATE INDEX "bahan_kajian_program_studi_id_idx" ON "bahan_kajian" ("program_studi_id");--> statement-breakpoint
CREATE INDEX "visi_misi_prodi_program_studi_id_idx" ON "visi_misi_prodi" ("program_studi_id");--> statement-breakpoint
CREATE INDEX "cpl_profil_lulusan_cpl_id_idx" ON "cpl_profil_lulusan" ("cpl_id");--> statement-breakpoint
CREATE INDEX "cpl_profil_lulusan_profil_lulusan_id_idx" ON "cpl_profil_lulusan" ("profil_lulusan_id");--> statement-breakpoint
CREATE INDEX "cpmk_cpl_cpmk_id_idx" ON "cpmk_cpl" ("cpmk_id");--> statement-breakpoint
CREATE INDEX "cpmk_cpl_cpl_id_idx" ON "cpmk_cpl" ("cpl_id");--> statement-breakpoint
CREATE INDEX "bahan_kajian_cpl_bahan_kajian_id_idx" ON "bahan_kajian_cpl" ("bahan_kajian_id");--> statement-breakpoint
CREATE INDEX "bahan_kajian_cpl_cpl_id_idx" ON "bahan_kajian_cpl" ("cpl_id");--> statement-breakpoint
CREATE INDEX "mata_kuliah_bahan_kajian_mata_kuliah_id_idx" ON "mata_kuliah_bahan_kajian" ("mata_kuliah_id");--> statement-breakpoint
CREATE INDEX "mata_kuliah_bahan_kajian_bahan_kajian_id_idx" ON "mata_kuliah_bahan_kajian" ("bahan_kajian_id");--> statement-breakpoint
CREATE INDEX "cpmk_kurikulum_mata_kuliah_id_idx" ON "cpmk" ("kurikulum_mata_kuliah_id");
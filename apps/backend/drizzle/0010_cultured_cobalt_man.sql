CREATE TABLE "angkatan_kurikulum" (
	"id" serial PRIMARY KEY NOT NULL,
	"program_studi_id" integer NOT NULL,
	"angkatan" varchar(4) NOT NULL,
	"kurikulum_id" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "angkatan_kurikulum_prodi_angkatan_unique" UNIQUE("program_studi_id","angkatan")
);
--> statement-breakpoint
ALTER TABLE "mata_kuliah" DROP CONSTRAINT "mata_kuliah_program_studi_id_program_studi_id_fk";
--> statement-breakpoint
ALTER TABLE "kurikulum" ADD COLUMN "is_locked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "angkatan_kurikulum" ADD CONSTRAINT "angkatan_kurikulum_program_studi_id_program_studi_id_fk" FOREIGN KEY ("program_studi_id") REFERENCES "public"."program_studi"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "angkatan_kurikulum" ADD CONSTRAINT "angkatan_kurikulum_kurikulum_id_kurikulum_id_fk" FOREIGN KEY ("kurikulum_id") REFERENCES "public"."kurikulum"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mata_kuliah" DROP COLUMN "program_studi_id";
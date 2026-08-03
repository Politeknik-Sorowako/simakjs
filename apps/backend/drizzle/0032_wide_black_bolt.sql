CREATE TABLE "bap_praktikum" (
	"id" serial PRIMARY KEY NOT NULL,
	"rombel_praktikum_id" integer NOT NULL,
	"tanggal" date NOT NULL,
	"sesi_ke" integer DEFAULT 1 NOT NULL,
	"materi" text NOT NULL,
	"catatan" text,
	"durasi_menit" integer DEFAULT 100 NOT NULL,
	"instruktur_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bap_topik" (
	"id" serial PRIMARY KEY NOT NULL,
	"bap_id" integer NOT NULL,
	"topik_id" integer,
	"cpmk_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "presensi_praktikum" (
	"id" serial PRIMARY KEY NOT NULL,
	"bap_praktikum_id" integer NOT NULL,
	"mahasiswa_id" integer NOT NULL,
	"status" "presensi_status" NOT NULL,
	"durasi_mangkir" integer DEFAULT 0 NOT NULL,
	"keterangan" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rombel_praktikum" (
	"id" serial PRIMARY KEY NOT NULL,
	"kelas_kuliah_id" integer NOT NULL,
	"nama_group" varchar(255) NOT NULL,
	"instrukturId" integer,
	"keterangan" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rombel_praktikum_mahasiswa" (
	"id" serial PRIMARY KEY NOT NULL,
	"rombel_praktikum_id" integer NOT NULL,
	"mahasiswa_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"kategori" varchar(50) NOT NULL,
	"nama" varchar(255) NOT NULL,
	"pesan" text NOT NULL,
	"rating" integer,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bap" ALTER COLUMN "cpmk_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "presensi_apel" ADD COLUMN "keterangan" text;--> statement-breakpoint
ALTER TABLE "sesi_apel" ADD COLUMN "catatan" text;--> statement-breakpoint
ALTER TABLE "bap_praktikum" ADD CONSTRAINT "bap_praktikum_rombel_praktikum_id_rombel_praktikum_id_fk" FOREIGN KEY ("rombel_praktikum_id") REFERENCES "public"."rombel_praktikum"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bap_praktikum" ADD CONSTRAINT "bap_praktikum_instruktur_id_dosen_id_fk" FOREIGN KEY ("instruktur_id") REFERENCES "public"."dosen"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bap_topik" ADD CONSTRAINT "bap_topik_bap_id_bap_id_fk" FOREIGN KEY ("bap_id") REFERENCES "public"."bap"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bap_topik" ADD CONSTRAINT "bap_topik_topik_id_rps_topik_id_fk" FOREIGN KEY ("topik_id") REFERENCES "public"."rps_topik"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bap_topik" ADD CONSTRAINT "bap_topik_cpmk_id_cpmk_id_fk" FOREIGN KEY ("cpmk_id") REFERENCES "public"."cpmk"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presensi_praktikum" ADD CONSTRAINT "presensi_praktikum_bap_praktikum_id_bap_praktikum_id_fk" FOREIGN KEY ("bap_praktikum_id") REFERENCES "public"."bap_praktikum"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presensi_praktikum" ADD CONSTRAINT "presensi_praktikum_mahasiswa_id_mahasiswa_id_fk" FOREIGN KEY ("mahasiswa_id") REFERENCES "public"."mahasiswa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rombel_praktikum" ADD CONSTRAINT "rombel_praktikum_kelas_kuliah_id_kelas_kuliah_id_fk" FOREIGN KEY ("kelas_kuliah_id") REFERENCES "public"."kelas_kuliah"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rombel_praktikum" ADD CONSTRAINT "rombel_praktikum_instrukturId_dosen_id_fk" FOREIGN KEY ("instrukturId") REFERENCES "public"."dosen"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rombel_praktikum_mahasiswa" ADD CONSTRAINT "rombel_praktikum_mahasiswa_rombel_praktikum_id_rombel_praktikum_id_fk" FOREIGN KEY ("rombel_praktikum_id") REFERENCES "public"."rombel_praktikum"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rombel_praktikum_mahasiswa" ADD CONSTRAINT "rombel_praktikum_mahasiswa_mahasiswa_id_mahasiswa_id_fk" FOREIGN KEY ("mahasiswa_id") REFERENCES "public"."mahasiswa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_feedback" ADD CONSTRAINT "system_feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
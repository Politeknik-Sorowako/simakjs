CREATE TYPE "public"."application_status" AS ENUM('draft', 'submitted', 'documents_verified', 'documents_rejected', 'exam_scheduled', 'exam_completed', 'passed', 'failed', 're_registration', 'nim_issued');--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'calon_mahasiswa';--> statement-breakpoint
CREATE TABLE "admission_session_prodis" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"prodi_id" integer NOT NULL,
	"kuota" integer,
	"passing_grade" numeric(5, 2),
	"biaya_daftar" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "adm_session_prodi_unique" UNIQUE("session_id","prodi_id")
);
--> statement-breakpoint
CREATE TABLE "admission_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"kode" varchar(20) NOT NULL,
	"nama" varchar(255) NOT NULL,
	"deskripsi" text,
	"tanggal_mulai" date NOT NULL,
	"tanggal_tutup" date NOT NULL,
	"tanggal_verif" date,
	"tanggal_ujian" date,
	"tanggal_pengumuman" date,
	"kuota" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admission_sessions_kode_unique" UNIQUE("kode")
);
--> statement-breakpoint
CREATE TABLE "applicant_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"requirement_id" integer NOT NULL,
	"file_path" text,
	"file_link" text,
	"upload_method" varchar(20) DEFAULT 'upload' NOT NULL,
	"original_name" varchar(255),
	"file_size_kb" integer,
	"mime_type" varchar(100),
	"is_verified" boolean DEFAULT false NOT NULL,
	"verified_by" integer,
	"verified_at" timestamp,
	"rejection_note" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "application_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"status_from" "application_status",
	"status_to" "application_status" NOT NULL,
	"message" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"session_id" integer NOT NULL,
	"no_pendaftar" varchar(30),
	"prodi_pilihan1" integer NOT NULL,
	"prodi_pilihan2" integer,
	"status" "application_status" DEFAULT 'draft' NOT NULL,
	"nik" varchar(16),
	"nama_lengkap" varchar(255),
	"tempat_lahir" varchar(100),
	"tanggal_lahir" date,
	"jenis_kelamin" "jenis_kelamin",
	"id_agama" integer,
	"kewarganegaraan" varchar(5) DEFAULT 'ID',
	"jalan" text,
	"rt" varchar(5),
	"rw" varchar(5),
	"kode_pos" varchar(10),
	"telepon" varchar(20),
	"nama_ibu_kandung" varchar(255),
	"asal_sekolah" varchar(255),
	"jurusan_sekolah" varchar(255),
	"tahun_lulus" varchar(4),
	"is_re_registered" boolean DEFAULT false NOT NULL,
	"re_registered_at" timestamp,
	"bukti_bayar_path" text,
	"nim_diterbitkan" varchar(50),
	"ukuran_jas" varchar(10),
	"final_score" numeric(5, 2),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "applications_no_pendaftar_unique" UNIQUE("no_pendaftar")
);
--> statement-breakpoint
CREATE TABLE "document_requirements" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"prodi_id" integer,
	"nama_dokumen" varchar(255) NOT NULL,
	"deskripsi" text,
	"is_wajib" boolean DEFAULT true NOT NULL,
	"format_file" varchar(50),
	"max_size_kb" integer DEFAULT 2048 NOT NULL,
	"urutan" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exam_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"session_id" integer NOT NULL,
	"reviewer_id" integer,
	"tipe_ujian" varchar(50) NOT NULL,
	"tanggal" date NOT NULL,
	"waktu_mulai" varchar(10) NOT NULL,
	"waktu_selesai" varchar(10),
	"lokasi_type" varchar(20) DEFAULT 'kampus' NOT NULL,
	"lokasi_detail" text,
	"catatan" text,
	"is_completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "re_registration_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"nominal" integer NOT NULL,
	"bukti_bayar" text NOT NULL,
	"bank_asal" varchar(100),
	"nama_pengirim" varchar(255),
	"is_verified" boolean DEFAULT false NOT NULL,
	"verified_by" integer,
	"verified_at" timestamp,
	"rejection_note" text,
	"paid_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "selection_components" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"prodi_id" integer,
	"nama_komponen" varchar(255) NOT NULL,
	"bobot" numeric(5, 2) NOT NULL,
	"tipe_penilai" varchar(20) DEFAULT 'admin' NOT NULL,
	"urutan" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "selection_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"component_id" integer NOT NULL,
	"score" numeric(5, 2) NOT NULL,
	"scored_by" integer NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "selection_scores_app_component_unique" UNIQUE("application_id","component_id")
);
--> statement-breakpoint
ALTER TABLE "admission_session_prodis" ADD CONSTRAINT "admission_session_prodis_session_id_admission_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."admission_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_session_prodis" ADD CONSTRAINT "admission_session_prodis_prodi_id_program_studi_id_fk" FOREIGN KEY ("prodi_id") REFERENCES "public"."program_studi"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applicant_documents" ADD CONSTRAINT "applicant_documents_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applicant_documents" ADD CONSTRAINT "applicant_documents_requirement_id_document_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."document_requirements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applicant_documents" ADD CONSTRAINT "applicant_documents_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_logs" ADD CONSTRAINT "application_logs_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_logs" ADD CONSTRAINT "application_logs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_session_id_admission_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."admission_sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_prodi_pilihan1_program_studi_id_fk" FOREIGN KEY ("prodi_pilihan1") REFERENCES "public"."program_studi"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_prodi_pilihan2_program_studi_id_fk" FOREIGN KEY ("prodi_pilihan2") REFERENCES "public"."program_studi"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requirements" ADD CONSTRAINT "document_requirements_session_id_admission_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."admission_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requirements" ADD CONSTRAINT "document_requirements_prodi_id_program_studi_id_fk" FOREIGN KEY ("prodi_id") REFERENCES "public"."program_studi"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_schedules" ADD CONSTRAINT "exam_schedules_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_schedules" ADD CONSTRAINT "exam_schedules_session_id_admission_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."admission_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_schedules" ADD CONSTRAINT "exam_schedules_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "re_registration_payments" ADD CONSTRAINT "re_registration_payments_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "re_registration_payments" ADD CONSTRAINT "re_registration_payments_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "selection_components" ADD CONSTRAINT "selection_components_session_id_admission_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."admission_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "selection_components" ADD CONSTRAINT "selection_components_prodi_id_program_studi_id_fk" FOREIGN KEY ("prodi_id") REFERENCES "public"."program_studi"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "selection_scores" ADD CONSTRAINT "selection_scores_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "selection_scores" ADD CONSTRAINT "selection_scores_component_id_selection_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."selection_components"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "selection_scores" ADD CONSTRAINT "selection_scores_scored_by_users_id_fk" FOREIGN KEY ("scored_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
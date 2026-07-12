ALTER TYPE "public"."application_status" ADD VALUE 'awaiting_payment' BEFORE 'submitted';--> statement-breakpoint
CREATE TABLE "payment_virtual_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"va_bank_id" integer NOT NULL,
	"va_number" varchar(50) NOT NULL,
	"nominal" integer NOT NULL,
	"is_paid" boolean DEFAULT false NOT NULL,
	"paid_at" timestamp,
	"verified_by" integer,
	"expired_at" timestamp,
	"midtrans_transaction_id" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "va_banks" (
	"id" serial PRIMARY KEY NOT NULL,
	"kode" varchar(20) NOT NULL,
	"nama" varchar(100) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_midtrans" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "va_banks_kode_unique" UNIQUE("kode")
);
--> statement-breakpoint
ALTER TABLE "payment_virtual_accounts" ADD CONSTRAINT "payment_virtual_accounts_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_virtual_accounts" ADD CONSTRAINT "payment_virtual_accounts_va_bank_id_va_banks_id_fk" FOREIGN KEY ("va_bank_id") REFERENCES "public"."va_banks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_virtual_accounts" ADD CONSTRAINT "payment_virtual_accounts_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
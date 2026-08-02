CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" integer,
	"user_role" varchar(50),
	"ip_address" varchar(45),
	"user_agent" text,
	"action_type" varchar(20) NOT NULL,
	"module" varchar(50) NOT NULL,
	"entity_id" varchar(100),
	"description" text NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_logs_timestamp" ON "audit_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_logs_user_module" ON "audit_logs" USING btree ("user_id","module");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_logs_action_module" ON "audit_logs" USING btree ("action_type","module");
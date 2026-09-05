-- Idempotent Migration: Add SSO, 2FA, and Account Activations
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "google_id" varchar(255);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "auth_provider" varchar(50) DEFAULT 'local' NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "two_factor_enabled" boolean DEFAULT false NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "two_factor_secret" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "two_factor_recovery_codes" jsonb DEFAULT '[]'::jsonb;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_google_id_unique'
  ) THEN
    ALTER TABLE "users" ADD CONSTRAINT "users_google_id_unique" UNIQUE ("google_id");
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "account_activations" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "email" varchar(255) NOT NULL,
  "token" varchar(255) NOT NULL UNIQUE,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

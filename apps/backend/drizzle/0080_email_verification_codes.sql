-- Fitur: 2FA Email OTP (aktivasi akun & reset password) — kode OTP 6-digit
-- di-hash (SHA-256) beserta batas percobaan, masa berlaku, dan cooldown kirim ulang.
-- Tabel ini sebelumnya hanya ada di schema.ts tanpa migrasi, sehingga endpoint
-- /auth/* (resend-activation, forgot-password, activate, reset-password) gagal
-- dengan "relation email_verification_codes does not exist" pada DB yang dimigrasi.
-- Idempoten: aman dijalankan berulang.

CREATE TABLE IF NOT EXISTS "email_verification_codes" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer,
  "email" varchar(255) NOT NULL,
  "code_hash" varchar(255) NOT NULL,
  "context" varchar(50) NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "expires_at" timestamp NOT NULL,
  "resend_after" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'email_verification_codes_user_id_users_id_fk'
  ) THEN
    ALTER TABLE "email_verification_codes"
      ADD CONSTRAINT "email_verification_codes_user_id_users_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "email_verification_codes_email_context_idx"
  ON "email_verification_codes" ("email", "context");

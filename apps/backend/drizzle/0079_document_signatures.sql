-- Fitur: TTE Fase 1 — tanda tangan dokumen cetak (QR Signed-Hash) & verifikasi publik.
-- Menyimpan snapshot hash SHA-256 + HMAC-SHA256 per dokumen (mis. KHS) beserta
-- uuid verifikasi publik yang dipindai QR. Multi-tenant agar dapat dipakai ERP kelak.
-- Idempoten: aman dijalankan berulang.

CREATE TABLE IF NOT EXISTS "document_signatures" (
  "id" serial PRIMARY KEY NOT NULL,
  "tenant" varchar(32) DEFAULT 'simak' NOT NULL,
  "doc_type" varchar(32) NOT NULL,
  "ref_id" varchar(128) NOT NULL,
  "doc_hash" varchar(64) NOT NULL,
  "signature" text NOT NULL,
  "kid" varchar(32) NOT NULL,
  "verify_uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
  "signer_user_id" integer,
  "signer_nama" varchar(255) NOT NULL,
  "signer_jabatan" varchar(100),
  "payload_snapshot" jsonb NOT NULL,
  "signed_at" timestamp DEFAULT now() NOT NULL,
  "revoked_at" timestamp,
  "revoked_by" integer,
  "revoke_reason" text,
  CONSTRAINT "document_signatures_verify_uuid_unique" UNIQUE("verify_uuid")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'document_signatures_signer_user_id_users_id_fk'
  ) THEN
    ALTER TABLE "document_signatures"
      ADD CONSTRAINT "document_signatures_signer_user_id_users_id_fk"
      FOREIGN KEY ("signer_user_id") REFERENCES "users"("id") ON DELETE set null;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'document_signatures_revoked_by_users_id_fk'
  ) THEN
    ALTER TABLE "document_signatures"
      ADD CONSTRAINT "document_signatures_revoked_by_users_id_fk"
      FOREIGN KEY ("revoked_by") REFERENCES "users"("id") ON DELETE set null;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "document_signatures_ref_idx"
  ON "document_signatures" ("tenant", "doc_type", "ref_id");

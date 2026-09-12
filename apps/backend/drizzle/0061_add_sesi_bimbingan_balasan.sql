-- Fitur: Thread percakapan per sesi bimbingan (mahasiswa <-> dosen PA) + status baca.
-- Idempoten: aman dijalankan berulang.

CREATE TABLE IF NOT EXISTS "sesi_bimbingan_balasan" (
  "id" serial PRIMARY KEY NOT NULL,
  "sesi_id" integer NOT NULL REFERENCES "sesi_bimbingan"("id") ON DELETE CASCADE,
  "sender_role" "user_role" NOT NULL,
  "pesan" text NOT NULL,
  "is_read_by_mahasiswa" boolean DEFAULT false NOT NULL,
  "read_at_mahasiswa" timestamp,
  "is_read_by_dosen" boolean DEFAULT false NOT NULL,
  "read_at_dosen" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_sesi_bimbingan_balasan_sesi_id" ON "sesi_bimbingan_balasan" ("sesi_id");

-- Flag baca agregat per sesi (status "ada aktivitas baru?").
ALTER TABLE "sesi_bimbingan" ADD COLUMN IF NOT EXISTS "is_read_by_mahasiswa" boolean DEFAULT true NOT NULL;
ALTER TABLE "sesi_bimbingan" ADD COLUMN IF NOT EXISTS "read_at_mahasiswa" timestamp;
ALTER TABLE "sesi_bimbingan" ADD COLUMN IF NOT EXISTS "is_read_by_dosen" boolean DEFAULT true NOT NULL;
ALTER TABLE "sesi_bimbingan" ADD COLUMN IF NOT EXISTS "read_at_dosen" timestamp;

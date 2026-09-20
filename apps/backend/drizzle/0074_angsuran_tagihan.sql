-- Fitur: Angsuran UKT 2x per semester (docs/product_backlog.md Epic 2).
-- Angsuran_tagihan mencatat pecahan termin I/II tiap tagihan. Jatuh tempo dan
-- pembagian nominal bersifat custom per skema_tarif (per angkatan+prodi); jika
-- kolom termin1/termin2 kosong, service memakai fallback 50/50 dengan Termin II
-- +60 hari setelah Termin I.
-- Idempoten: aman dijalankan berulang.

CREATE TABLE IF NOT EXISTS "angsuran_tagihan" (
  "id" serial PRIMARY KEY NOT NULL,
  "tagihan_id" integer NOT NULL,
  "termin_ke" integer NOT NULL,
  "nominal" integer NOT NULL,
  "nominal_terbayar" integer DEFAULT 0 NOT NULL,
  "jatuh_tempo" date NOT NULL,
  "status" "tagihan_status" DEFAULT 'belum_bayar' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "angsuran_tagihan_tagihan_termin_unique" UNIQUE("tagihan_id","termin_ke")
);
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'angsuran_tagihan_tagihan_id_tagihan_id_fk'
  ) THEN
    ALTER TABLE "angsuran_tagihan"
      ADD CONSTRAINT "angsuran_tagihan_tagihan_id_tagihan_id_fk"
      FOREIGN KEY ("tagihan_id") REFERENCES "tagihan"("id") ON DELETE cascade;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "angsuran_tagihan_tagihan_id_idx" ON "angsuran_tagihan" ("tagihan_id");
CREATE INDEX IF NOT EXISTS "angsuran_tagihan_jatuh_tempo_idx" ON "angsuran_tagihan" ("jatuh_tempo");

ALTER TABLE "skema_tarif" ADD COLUMN IF NOT EXISTS "termin1_nominal" integer;
ALTER TABLE "skema_tarif" ADD COLUMN IF NOT EXISTS "termin1_tempo_hari" integer;
ALTER TABLE "skema_tarif" ADD COLUMN IF NOT EXISTS "termin2_nominal" integer;
ALTER TABLE "skema_tarif" ADD COLUMN IF NOT EXISTS "termin2_tempo_hari" integer;
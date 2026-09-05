ALTER TABLE "pelanggaran" ADD COLUMN IF NOT EXISTS "periode_id" varchar(5) REFERENCES "periode_akademik"("id") ON DELETE set null;
CREATE INDEX IF NOT EXISTS "idx_pelanggaran_periode_id" ON "pelanggaran" ("periode_id");

-- Fitur: BPA-compliance kurikulum blok (docs/product_backlog.md Epic 1).
-- Kurikulum ditetapkan melalui SK Direktur dan memakai sistem blok. Kolom no_sk_direktur
-- dan tanggal_sk_direktur bersifat opsional (NULL = belum patuh, diberi badge warning),
-- bukan hard-block, agar kurikulum lama tetap berjalan.
-- Idempoten: aman dijalankan berulang.

ALTER TABLE "kurikulum" ADD COLUMN IF NOT EXISTS "sistem_blok" boolean NOT NULL DEFAULT true;
ALTER TABLE "kurikulum" ADD COLUMN IF NOT EXISTS "no_sk_direktur" varchar(100);
ALTER TABLE "kurikulum" ADD COLUMN IF NOT EXISTS "tanggal_sk_direktur" date;

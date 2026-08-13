-- Fitur: Bobot poin pelanggaran otomatis mengikuti jenis sanksi (Lisan=1 / Tertulis=4).
-- Kolom bobot_poin pada pelanggaran dan pasal_pelanggaran tidak lagi digunakan.
-- All statements are idempotent / guarded so they are safe to run repeatedly.

ALTER TABLE "pelanggaran" DROP COLUMN IF EXISTS "bobot_poin";
ALTER TABLE "pasal_pelanggaran" DROP COLUMN IF EXISTS "bobot_poin";

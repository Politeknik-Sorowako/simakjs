-- Fitur: Bobot poin pelanggaran otomatis mengikuti jenis sanksi (Lisan=1 / Tertulis=4).
-- Kolom bobot_poin pada pelanggaran dan pasal_pelanggaran tidak lagi digunakan.
-- All statements are idempotent / guarded so they are safe to run repeatedly.
--
-- CATATAN DATA: Kolom ini dihapus permanen. Sebelum menjalankan migrasi ini,
-- pastikan backup database lengkap (dijalankan otomatis oleh `db:safe-migrate`),
-- karena nilai bobot_poin lama tidak dapat dikembalikan setelah kolom di-drop.

ALTER TABLE "pelanggaran" DROP COLUMN IF EXISTS "bobot_poin";
ALTER TABLE "pasal_pelanggaran" DROP COLUMN IF EXISTS "bobot_poin";

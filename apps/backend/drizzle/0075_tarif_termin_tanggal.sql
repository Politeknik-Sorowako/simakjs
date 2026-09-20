-- Fitur: Tarif termin berbasis tanggal absolut (docs/product_backlog.md Epic 2).
-- Menggantikan kolom termin1/2_tempo_hari (DEPRECATED — tidak dipakai service
-- setelah migrasi ini) dengan tanggal jatuh tempo eksplisit per termin.
-- Kolom tempo_hari sengaja tidak di-drop agar tidak merusak data staging yang
-- masih tersisa; service kini membaca termin1/2_jatuh_tempo saja.
-- Idempoten: aman dijalankan berulang.

ALTER TABLE "skema_tarif" ADD COLUMN IF NOT EXISTS "termin1_jatuh_tempo" date;
ALTER TABLE "skema_tarif" ADD COLUMN IF NOT EXISTS "termin2_jatuh_tempo" date;
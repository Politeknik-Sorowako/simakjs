-- Fitur: Toggle blocking KHS & KRS saat mahasiswa memiliki tunggakan.
-- BLOCK_KHS_JIKA_TANGGUNGAN default 'true'  (mempertahankan perilaku produksi saat ini).
-- BLOCK_KRS_JIKA_TANGGUNGAN default 'false' (opt-in, tidak memblokir pengisian massal).
-- Idempoten: aman dijalankan berulang.

INSERT INTO "system_settings" ("key", "value", "param_type", "description")
VALUES ('BLOCK_KHS_JIKA_TANGGUNGAN', 'true', 'boolean', 'Blokir akses KHS mahasiswa jika masih memiliki tunggakan SPP/kompensasi')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "system_settings" ("key", "value", "param_type", "description")
VALUES ('BLOCK_KRS_JIKA_TANGGUNGAN', 'false', 'boolean', 'Blokir pengisian KRS mandiri mahasiswa jika masih memiliki tunggakan SPP/kompensasi')
ON CONFLICT ("key") DO NOTHING;

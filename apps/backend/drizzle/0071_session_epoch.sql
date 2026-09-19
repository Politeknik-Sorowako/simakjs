-- Fitur: Kill-switch sesi (SESSION_EPOCH).
-- Menaikkan nilai ini memaksa semua pengguna login ulang: token dengan
-- sessEpoch lebih kecil dari nilai ini ditolak middleware.
-- Idempoten: aman dijalankan berulang.

INSERT INTO "system_settings" ("key", "value", "param_type", "description")
VALUES ('SESSION_EPOCH', '1', 'number', 'Epoch sesi (kill-switch). Menaikkan nilai ini memaksa semua pengguna login ulang.')
ON CONFLICT ("key") DO NOTHING;

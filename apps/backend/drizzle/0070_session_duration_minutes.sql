-- Fitur: Durasi sesi login (idle timeout) yang dapat diatur admin.
-- Parameter number SESSION_DURATION_MINUTES (default '480' = 8 jam idle sejak aktivitas terakhir).
-- Idempoten: aman dijalankan berulang.

INSERT INTO "system_settings" ("key", "value", "param_type", "description")
VALUES ('SESSION_DURATION_MINUTES', '480', 'number', 'Durasi sesi login dalam menit (idle timeout). Sesi berakhir jika tidak ada aktivitas selama durasi ini. Berlaku efektif untuk login/refresh token berikutnya.')
ON CONFLICT ("key") DO NOTHING;
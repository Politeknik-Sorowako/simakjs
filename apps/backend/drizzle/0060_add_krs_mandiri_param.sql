-- Fitur: Toggle pengisian KRS mandiri oleh mahasiswa.
-- Parameter boolean KRS_MANDIRI_ENABLED (default 'true' = fail-open).
-- Idempoten: aman dijalankan berulang.

INSERT INTO "system_settings" ("key", "value", "param_type", "description")
VALUES ('KRS_MANDIRI_ENABLED', 'true', 'boolean', 'Izinkan mahasiswa melakukan pengisian KRS secara mandiri')
ON CONFLICT ("key") DO NOTHING;

-- Parameter nomor surat SKPI (dapat diubah admin via Konfigurasi → Parameter).
-- Menjamin baris tersedia agar format dapat disesuaikan tanpa perubahan kode
-- (PRD 015 §11). Placeholder {tahun} & {nim} diganti otomatis backend.
-- Idempoten: aman dijalankan berulang.

INSERT INTO "system_settings" ("key", "value", "param_type", "description")
VALUES (
  'skpi_nomor_format',
  'SKPI/{tahun}/{nim}',
  'string',
  'Format nomor surat SKPI — placeholder {tahun} dan {nim} diganti otomatis'
)
ON CONFLICT ("key") DO NOTHING;

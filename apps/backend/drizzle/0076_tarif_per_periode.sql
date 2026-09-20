-- Fitur: Skema tarif per (angkatan x prodi x periode semester) (docs/product_backlog.md Epic 2).
-- Tarif kini wajib terikat ke satu periode akademik. Generate tagihan hanya memakai
-- tarif dengan periode yang sesuai; baris legacy (NULL) di-backfill ke periode aktif.
-- Idempoten: aman dijalankan berulang.

ALTER TABLE "skema_tarif" ADD COLUMN IF NOT EXISTS "periode_id" varchar(5);

-- Backfill baris legacy ke periode aktif (asumsi: hanya ada satu periode aktif).
DO $$
DECLARE aktif_id varchar(5);
BEGIN
  SELECT id INTO aktif_id FROM "periode_akademik" WHERE aktif = true LIMIT 1;
  IF aktif_id IS NOT NULL THEN
    UPDATE "skema_tarif" SET "periode_id" = aktif_id WHERE "periode_id" IS NULL;
  END IF;
END $$;

-- Hanya tetapkan NOT NULL bila tidak ada baris NULL tersisa (hindari kegagalan
-- bila belum ada periode aktif).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "skema_tarif" WHERE "periode_id" IS NULL) THEN
    ALTER TABLE "skema_tarif" ALTER COLUMN "periode_id" SET NOT NULL;
  END IF;
END $$;

-- Tambah FK ke periode_akademik (idempoten via constraint check)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'skema_tarif_periode_id_periode_akademik_id_fk'
  ) THEN
    ALTER TABLE "skema_tarif"
      ADD CONSTRAINT "skema_tarif_periode_id_periode_akademik_id_fk"
      FOREIGN KEY ("periode_id") REFERENCES "periode_akademik"("id") ON DELETE restrict;
  END IF;
END $$;

-- Ganti unique (angkatan, prodi) menjadi (angkatan, prodi, periode).
ALTER TABLE "skema_tarif" DROP CONSTRAINT IF EXISTS "skema_tarif_angkatan_prodi_unique";
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'skema_tarif_angkatan_prodi_periode_unique'
  ) THEN
    ALTER TABLE "skema_tarif"
      ADD CONSTRAINT "skema_tarif_angkatan_prodi_periode_unique"
      UNIQUE ("angkatan", "program_studi_id", "periode_id");
  END IF;
END $$;
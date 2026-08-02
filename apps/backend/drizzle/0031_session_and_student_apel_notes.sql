ALTER TABLE "sesi_apel" ADD COLUMN IF NOT EXISTS "catatan" text;
--> statement-breakpoint
ALTER TABLE "presensi_apel" ADD COLUMN IF NOT EXISTS "keterangan" text;

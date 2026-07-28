ALTER TABLE "kelompok_apel" DROP CONSTRAINT "kelompok_apel_program_studi_id_program_studi_id_fk";
--> statement-breakpoint
ALTER TABLE "bap" DROP COLUMN "catatan";--> statement-breakpoint
ALTER TABLE "kelompok_apel" DROP COLUMN "program_studi_id";--> statement-breakpoint
ALTER TABLE "presensi" DROP COLUMN "keterangan";
ALTER TABLE "krs" DROP CONSTRAINT "krs_mahasiswa_kelas_unique";--> statement-breakpoint
ALTER TABLE "bap" ADD COLUMN "catatan" text;--> statement-breakpoint
ALTER TABLE "presensi" ADD COLUMN "keterangan" text;
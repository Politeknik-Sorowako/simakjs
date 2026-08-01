ALTER TABLE "mahasiswa" ALTER COLUMN "tanggal_lahir" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "bap" ADD COLUMN "catatan" text;--> statement-breakpoint
ALTER TABLE "presensi" ADD COLUMN "keterangan" text;--> statement-breakpoint
ALTER TABLE "krs" ADD CONSTRAINT "krs_mahasiswa_kelas_unique" UNIQUE("mahasiswa_id","kelas_kuliah_id");
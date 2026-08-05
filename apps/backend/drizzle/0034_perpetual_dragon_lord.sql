CREATE INDEX IF NOT EXISTS "idx_kompensasi_manual_mhs_tgl" ON "kompensasi_manual" USING btree ("mahasiswa_id","tanggal");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_kompensasi_manual_jenis" ON "kompensasi_manual" USING btree ("jenis_kompen");

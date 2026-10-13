-- Lampiran (Surat SK + berkas pendukung) untuk pengajuan cuti & mahasiswa keluar.
-- Idempoten: aman dijalankan berulang.

CREATE TABLE IF NOT EXISTS "status_mahasiswa_lampiran" (
  "id" serial PRIMARY KEY NOT NULL,
  "pengajuan_cuti_id" integer,
  "mahasiswa_keluar_id" integer,
  "jenis" varchar(20) NOT NULL,
  "storage_key" varchar(255) NOT NULL,
  "file_name" varchar(255) NOT NULL,
  "file_size" integer NOT NULL,
  "file_type" varchar(100) NOT NULL,
  "keterangan" varchar(255),
  "uploaded_by" integer,
  "created_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sml_pengajuan_cuti_id_fk') THEN
    ALTER TABLE "status_mahasiswa_lampiran"
      ADD CONSTRAINT "sml_pengajuan_cuti_id_fk" FOREIGN KEY ("pengajuan_cuti_id")
      REFERENCES "pengajuan_cuti"("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sml_mahasiswa_keluar_id_fk') THEN
    ALTER TABLE "status_mahasiswa_lampiran"
      ADD CONSTRAINT "sml_mahasiswa_keluar_id_fk" FOREIGN KEY ("mahasiswa_keluar_id")
      REFERENCES "mahasiswa_keluar"("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sml_uploaded_by_fk') THEN
    ALTER TABLE "status_mahasiswa_lampiran"
      ADD CONSTRAINT "sml_uploaded_by_fk" FOREIGN KEY ("uploaded_by")
      REFERENCES "users"("id") ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sml_exactly_one_parent') THEN
    ALTER TABLE "status_mahasiswa_lampiran"
      ADD CONSTRAINT "sml_exactly_one_parent"
      CHECK (("pengajuan_cuti_id" IS NOT NULL)::int + ("mahasiswa_keluar_id" IS NOT NULL)::int = 1);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "sml_cuti_idx" ON "status_mahasiswa_lampiran" ("pengajuan_cuti_id");
CREATE INDEX IF NOT EXISTS "sml_keluar_idx" ON "status_mahasiswa_lampiran" ("mahasiswa_keluar_id");
CREATE UNIQUE INDEX IF NOT EXISTS "sml_cuti_sk_uq" ON "status_mahasiswa_lampiran" ("pengajuan_cuti_id") WHERE "jenis" = 'sk';
CREATE UNIQUE INDEX IF NOT EXISTS "sml_keluar_sk_uq" ON "status_mahasiswa_lampiran" ("mahasiswa_keluar_id") WHERE "jenis" = 'sk';

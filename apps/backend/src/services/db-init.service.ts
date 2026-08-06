import { db } from '../utils/db';

export class DbInitService {
  static async ensureTablesExist(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      console.warn('[DbInitService] Skipping auto-init in production. Use migrations instead.');
      return;
    }
    try {
      // 1. Ensure system_settings table exists
      await db.execute(`
        CREATE TABLE IF NOT EXISTS "system_settings" (
          "key" varchar(100) PRIMARY KEY NOT NULL,
          "value" text NOT NULL,
          "description" text,
          "updated_at" timestamp DEFAULT now() NOT NULL
        );
      `);

      // Seed default setting if not present
      await db.execute(`
        INSERT INTO "system_settings" ("key", "value", "description")
        VALUES ('feature_feedback_enabled', 'true', 'Pengaktifan modul evaluasi & feedback sistem')
        ON CONFLICT ("key") DO NOTHING;
      `);

      // 2. Ensure kategori_bimbingan table exists
      await db.execute(`
        CREATE TABLE IF NOT EXISTS "kategori_bimbingan" (
          "id" serial PRIMARY KEY NOT NULL,
          "nama" varchar(100) NOT NULL UNIQUE,
          "deskripsi" text,
          "is_active" boolean DEFAULT true NOT NULL,
          "created_at" timestamp DEFAULT now() NOT NULL,
          "updated_at" timestamp DEFAULT now() NOT NULL
        );
      `);

      // Seed default categories if table is empty
      await db.execute(`
        INSERT INTO "kategori_bimbingan" ("nama", "deskripsi")
        VALUES 
          ('Bimbingan PA / Akademik', 'Pembimbingan akademik dan perwalian mahasiswa oleh Dosen Pembimbing Akademik'),
          ('Tugas Akhir / Skripsi', 'Pembimbingan penulisan Tugas Akhir atau Skripsi'),
          ('Asistensi & Praktikum', 'Pembimbingan asistensi perkuliahan atau laboratorium')
        ON CONFLICT ("nama") DO NOTHING;
      `);

      // 3. Ensure bimbingan & sesi_bimbingan tables have kategori_id column
      await db.execute(`
        ALTER TABLE "bimbingan" ADD COLUMN IF NOT EXISTS "kategori_id" integer;
      `);
      await db.execute(`
        ALTER TABLE "sesi_bimbingan" ADD COLUMN IF NOT EXISTS "kategori_id" integer;
      `);

      // 4. Ensure system_feedback table exists
      await db.execute(`
        CREATE TABLE IF NOT EXISTS "system_feedback" (
          "id" serial PRIMARY KEY NOT NULL,
          "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
          "kategori" varchar(50) NOT NULL,
          "nama" varchar(255) NOT NULL,
          "pesan" text NOT NULL,
          "rating" integer,
          "status" varchar(50) DEFAULT 'pending' NOT NULL,
          "created_at" timestamp DEFAULT now() NOT NULL,
          "updated_at" timestamp DEFAULT now() NOT NULL
        );
      `);
      // 5. Ensure rps_topik and bap_topik tables exist
      await db.execute(`
        CREATE TABLE IF NOT EXISTS "rps_topik" (
          "id" serial PRIMARY KEY NOT NULL,
          "rps_id" integer NOT NULL,
          "pertemuan_ke" integer NOT NULL,
          "topik" varchar(255) NOT NULL,
          "sub_topik" text,
          "metode" varchar(100),
          "cpmk_id" integer,
          "sub_cpmk_id" integer,
          "id_pddikti" varchar(50)
        );
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS "bap_topik" (
          "id" serial PRIMARY KEY NOT NULL,
          "bap_id" integer NOT NULL REFERENCES "bap"("id") ON DELETE CASCADE,
          "topik_id" integer REFERENCES "rps_topik"("id") ON DELETE CASCADE,
          "cpmk_id" integer REFERENCES "cpmk"("id") ON DELETE CASCADE,
          "created_at" timestamp DEFAULT now() NOT NULL
        );
      `);

      // 6. Ensure kompensasi_manual table exists
      await db.execute(`
        CREATE TABLE IF NOT EXISTS "kompensasi_manual" (
          "id" serial PRIMARY KEY NOT NULL,
          "mahasiswa_id" integer NOT NULL REFERENCES "mahasiswa"("id") ON DELETE CASCADE,
          "tanggal" date NOT NULL,
          "jenis_kompen" varchar(20) NOT NULL,
          "durasi_menit" integer DEFAULT 0 NOT NULL,
          "keterangan" text,
          "created_by" integer REFERENCES "users"("id") ON DELETE SET NULL,
          "created_at" timestamp DEFAULT now() NOT NULL,
          "updated_at" timestamp DEFAULT now() NOT NULL
        );
        CREATE INDEX IF NOT EXISTS "idx_kompensasi_manual_mhs_tgl" ON "kompensasi_manual" ("mahasiswa_id", "tanggal");
        CREATE INDEX IF NOT EXISTS "idx_kompensasi_manual_jenis" ON "kompensasi_manual" ("jenis_kompen");
      `);

      // 7. Ensure nilai_praktik table exists
      await db.execute(`
        CREATE TABLE IF NOT EXISTS "nilai_praktik" (
          "id" serial PRIMARY KEY NOT NULL,
          "rombel_praktikum_id" integer NOT NULL REFERENCES "rombel_praktikum"("id") ON DELETE CASCADE,
          "mahasiswa_id" integer NOT NULL REFERENCES "mahasiswa"("id") ON DELETE CASCADE,
          "komponen_nilai_id" integer REFERENCES "komponen_nilai"("id") ON DELETE SET NULL,
          "nilai_angka" numeric(5, 2) NOT NULL,
          "keterangan" text,
          "created_by" integer REFERENCES "users"("id") ON DELETE SET NULL,
          "created_at" timestamp DEFAULT now() NOT NULL,
          "updated_at" timestamp DEFAULT now() NOT NULL
        );
      `);
    } catch (err: unknown) {
      console.warn('[DbInitService] Failed to auto-ensure DB tables:', err instanceof Error ? err.message : err);
    }
  }
}

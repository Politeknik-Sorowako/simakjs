import { db } from '../utils/db';

export class DbInitService {
  static async ensureTablesExist(): Promise<void> {
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
          ('Bimbingan Akademik / Wali', 'Konsultasi KRS, KHS, IPK, dan perkembangan akademik umum'),
          ('Asistensi / Tugas', 'Asistensi tugas kuliah dan praktikum'),
          ('Tugas Akhir', 'Bimbingan penyusunan Tugas Akhir (TA)'),
          ('Skripsi', 'Bimbingan penelitian dan penulisan skripsi'),
          ('Praktik Kerja Lapangan (PKL)', 'Bimbingan magang dan laporan PKL')
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
    } catch (err: unknown) {
      console.warn('[DbInitService] Failed to auto-ensure DB tables:', err instanceof Error ? err.message : err);
    }
  }
}

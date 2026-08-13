import { pool } from '../utils/db';

async function migrateBimbinganRefactor() {
  console.log('[MIGRATION] Starting bimbingan refactor migration...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. bimbingan table updates
    await client.query(`
      ALTER TABLE "bimbingan" ADD COLUMN IF NOT EXISTS "topik_bimbingan" text;
      ALTER TABLE "bimbingan" ADD COLUMN IF NOT EXISTS "kategori" varchar(20) DEFAULT 'PA' NOT NULL;
      ALTER TABLE "bimbingan" ADD COLUMN IF NOT EXISTS "is_read_by_mahasiswa" boolean DEFAULT false NOT NULL;
      ALTER TABLE "bimbingan" ADD COLUMN IF NOT EXISTS "read_at_mahasiswa" timestamp;
    `);

    // Backfill topik_bimbingan from permasalahan if null
    await client.query(`
      UPDATE "bimbingan" SET "topik_bimbingan" = "permasalahan" WHERE "topik_bimbingan" IS NULL AND "permasalahan" IS NOT NULL;
    `);

    // 2. bimbingan_thread table updates
    await client.query(`
      ALTER TABLE "bimbingan_thread" ADD COLUMN IF NOT EXISTS "is_read_by_mahasiswa" boolean DEFAULT false NOT NULL;
      ALTER TABLE "bimbingan_thread" ADD COLUMN IF NOT EXISTS "read_at_mahasiswa" timestamp;
    `);

    // 3. sesi_bimbingan table updates
    await client.query(`
      ALTER TABLE "sesi_bimbingan" ADD COLUMN IF NOT EXISTS "topik_bimbingan" text;
      ALTER TABLE "sesi_bimbingan" ALTER COLUMN "permasalahan" DROP NOT NULL;
    `);
    await client.query(`
      UPDATE "sesi_bimbingan" SET "topik_bimbingan" = "permasalahan" WHERE "topik_bimbingan" IS NULL AND "permasalahan" IS NOT NULL;
    `);

    // 4. notifications table updates
    await client.query(`
      ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "link" text;
    `);

    // 5. bimbingan_attachments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "bimbingan_attachments" (
        "id" SERIAL PRIMARY KEY,
        "bimbingan_id" integer NOT NULL REFERENCES "bimbingan"("id") ON DELETE CASCADE,
        "bimbingan_thread_id" integer REFERENCES "bimbingan_thread"("id") ON DELETE CASCADE,
        "file_url" text NOT NULL,
        "file_name" varchar(255) NOT NULL,
        "file_size" integer NOT NULL,
        "file_type" varchar(100) NOT NULL,
        "uploaded_by" integer REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    await client.query('COMMIT');
    console.log('[MIGRATION] Bimbingan refactor migration completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[MIGRATION] Failed to execute bimbingan refactor migration:', error);
    throw error;
  } finally {
    client.release();
  }
}

migrateBimbinganRefactor()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration error stack:', err);
    process.exit(1);
  });

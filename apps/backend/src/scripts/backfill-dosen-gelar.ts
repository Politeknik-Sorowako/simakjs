import { eq, isNull } from 'drizzle-orm';
import { dosen } from '../models/schema';
import { db } from '../utils/db';
import { parseNamaGelar } from '../utils/nama-gelar';

/**
 * Script backfill untuk memisahkan nama asli dan gelar akademik (gelar_depan, nama, gelar_belakang)
 * pada data dosen eksisting di database lokal yang saat ini kolom gelar_depan dan gelar_belakang-nya masih null.
 *
 * Jalankan via:
 *   bun run apps/backend/src/scripts/backfill-dosen-gelar.ts
 */
async function backfillDosenGelar() {
  console.log('Memulai backfill pemisahan gelar dan nama dosen lokal...');

  const allDosen = await db
    .select({
      id: dosen.id,
      nip: dosen.nip,
      nama: dosen.nama,
      gelarDepan: dosen.gelarDepan,
      gelarBelakang: dosen.gelarBelakang,
    })
    .from(dosen);

  let updatedCount = 0;
  let skippedCount = 0;

  for (const d of allDosen) {
    // Jika sudah ada gelar depan atau belakang terisi, lewati agar tidak menimpa editan manual
    if (d.gelarDepan !== null || d.gelarBelakang !== null) {
      skippedCount++;
      continue;
    }

    const parsed = parseNamaGelar(d.nama);

    // Bila terdeteksi gelar depan atau gelar belakang, atau nama bersih berbeda
    if (parsed.gelarDepan || parsed.gelarBelakang) {
      await db
        .update(dosen)
        .set({
          gelarDepan: parsed.gelarDepan,
          nama: parsed.nama,
          gelarBelakang: parsed.gelarBelakang,
        })
        .where(eq(dosen.id, d.id));

      console.log(
        `✓ [Dosen ID ${d.id}] "${d.nama}" -> Depan: "${parsed.gelarDepan || '-'}", Nama: "${parsed.nama}", Belakang: "${parsed.gelarBelakang || '-'}"`,
      );
      updatedCount++;
    } else {
      skippedCount++;
    }
  }

  console.log(`\nSelesai! ${updatedCount} dosen diperbarui, ${skippedCount} dosen dilewati/tetap.`);
}

if (import.meta.main) {
  backfillDosenGelar()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Gagal menjalankan backfill:', err);
      process.exit(1);
    });
}

export { backfillDosenGelar };

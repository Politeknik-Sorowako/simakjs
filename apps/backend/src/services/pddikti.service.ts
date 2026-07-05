import crypto from 'crypto';
import { and, count, eq, isNull } from 'drizzle-orm';
import { kelasKuliah, krs, mahasiswa, mataKuliah, programStudi } from '../models/schema';
import { db } from '../utils/db';

export class PddiktiService {
  static async getStats() {
    const [totalMhs] = await db.select({ count: count() }).from(mahasiswa);
    const [syncedMhs] = await db.select({ count: count() }).from(mahasiswa).where(eq(mahasiswa.isSynced, true));

    const [totalKelas] = await db.select({ count: count() }).from(kelasKuliah);
    const [syncedKelas] = await db.select({ count: count() }).from(kelasKuliah).where(eq(kelasKuliah.isSynced, true));

    const [totalKrs] = await db.select({ count: count() }).from(krs);
    const [syncedKrs] = await db.select({ count: count() }).from(krs).where(eq(krs.isSynced, true));

    return {
      mahasiswa: {
        total: totalMhs?.count || 0,
        synced: syncedMhs?.count || 0,
        unsynced: (totalMhs?.count || 0) - (syncedMhs?.count || 0),
      },
      kelasKuliah: {
        total: totalKelas?.count || 0,
        synced: syncedKelas?.count || 0,
        unsynced: (totalKelas?.count || 0) - (syncedKelas?.count || 0),
      },
      krs: {
        total: totalKrs?.count || 0,
        synced: syncedKrs?.count || 0,
        unsynced: (totalKrs?.count || 0) - (syncedKrs?.count || 0),
      },
    };
  }

  static async syncAll() {
    return await db.transaction(async (tx) => {
      // 1. Sync Program Studi
      const unsyncedProdi = await tx.select().from(programStudi).where(eq(programStudi.isSynced, false));
      for (const p of unsyncedProdi) {
        await tx
          .update(programStudi)
          .set({
            isSynced: true,
            idPddikti: p.idPddikti || crypto.randomUUID(),
            lastSyncAt: new Date(),
          })
          .where(eq(programStudi.id, p.id));
      }

      // 2. Sync Mata Kuliah
      const unsyncedMk = await tx.select().from(mataKuliah).where(eq(mataKuliah.isSynced, false));
      for (const mk of unsyncedMk) {
        await tx
          .update(mataKuliah)
          .set({
            isSynced: true,
            idPddikti: mk.idPddikti || crypto.randomUUID(),
            lastSyncAt: new Date(),
          })
          .where(eq(mataKuliah.id, mk.id));
      }

      // 3. Sync Mahasiswa
      const unsyncedMhs = await tx.select().from(mahasiswa).where(eq(mahasiswa.isSynced, false));
      for (const mhs of unsyncedMhs) {
        await tx
          .update(mahasiswa)
          .set({
            isSynced: true,
            idPddikti: mhs.idPddikti || crypto.randomUUID(),
            lastSyncAt: new Date(),
          })
          .where(eq(mahasiswa.id, mhs.id));
      }

      // 4. Sync Kelas Kuliah
      const unsyncedKelas = await tx.select().from(kelasKuliah).where(eq(kelasKuliah.isSynced, false));
      for (const k of unsyncedKelas) {
        await tx
          .update(kelasKuliah)
          .set({
            isSynced: true,
            idPddikti: k.idPddikti || crypto.randomUUID(),
            lastSyncAt: new Date(),
          })
          .where(eq(kelasKuliah.id, k.id));
      }

      // 5. Sync KRS
      const unsyncedKrs = await tx
        .select()
        .from(krs)
        .where(and(eq(krs.isSynced, false), eq(krs.isApproved, true)));
      for (const item of unsyncedKrs) {
        await tx
          .update(krs)
          .set({
            isSynced: true,
            idPddikti: item.idPddikti || crypto.randomUUID(),
            lastSyncAt: new Date(),
          })
          .where(eq(krs.id, item.id));
      }

      return {
        message: 'Sinkronisasi dengan Neo Feeder PDDIKTI berhasil dilaksanakan.',
        details: {
          prodiSynced: unsyncedProdi.length,
          mataKuliahSynced: unsyncedMk.length,
          mahasiswaSynced: unsyncedMhs.length,
          kelasSynced: unsyncedKelas.length,
          krsSynced: unsyncedKrs.length,
        },
      };
    });
  }
}

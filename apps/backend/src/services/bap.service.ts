import { eq, inArray } from 'drizzle-orm';
import { bap, bapTopik, dosen, dosenPengajarKelas, kelasKuliah, rps, rpsTopik } from '../models/schema';
import { db } from '../utils/db';

export class BapService {
  static async getByKelas(kelasKuliahId: number) {
    const list = await db.select().from(bap).where(eq(bap.kelasKuliahId, kelasKuliahId));
    if (list.length === 0) return [];

    const bapIds = list.map((b) => b.id);
    const topiks = await db.select().from(bapTopik).where(inArray(bapTopik.bapId, bapIds));

    return list.map((b) => ({
      ...b,
      topikIds: topiks
        .filter((t) => t.bapId === b.id)
        .map((t) => t.topikId || t.cpmkId)
        .filter(Boolean),
      topikList: topiks.filter((t) => t.bapId === b.id),
    }));
  }

  static async getRpsTopikByKelas(kelasKuliahId: number) {
    // Find class to get mataKuliahId and periodeId
    const kelas = await db.query.kelasKuliah.findFirst({
      where: eq(kelasKuliah.id, kelasKuliahId),
    });
    if (!kelas) return [];

    // Find RPS associated with mataKuliahId and periodeId
    const matchedRps = await db.query.rps.findFirst({
      where: (rpsTable, { and }) =>
        and(eq(rpsTable.mataKuliahId, kelas.mataKuliahId), eq(rpsTable.periodeId, kelas.periodeId)),
    });
    if (!matchedRps) return [];

    // Return all topics under that RPS
    return await db.select().from(rpsTopik).where(eq(rpsTopik.rpsId, matchedRps.id));
  }

  static async getDosenByEmail(email: string) {
    const profile = await db.query.dosen.findFirst({ where: eq(dosen.email, email) });
    return profile || null;
  }

  static async getDosenById(id: number) {
    const profile = await db.query.dosen.findFirst({ where: eq(dosen.id, id) });
    return profile || null;
  }

  static async getFirstTeachingDosen(kelasKuliahId: number) {
    const pengajar = await db.query.dosenPengajarKelas.findFirst({
      where: eq(dosenPengajarKelas.kelasKuliahId, kelasKuliahId),
    });
    return pengajar || null;
  }

  static async getAnyDosen() {
    const anyDosen = await db.query.dosen.findFirst();
    return anyDosen || null;
  }

  static async create(data: {
    kelasKuliahId: number;
    tanggal: string;
    pertemuanKe: number;
    materi: string;
    catatan?: string | null;
    durasiMenit: number;
    cpmkId?: number | null;
    topikIds?: number[];
    dosenId: number;
  }) {
    const { topikIds, ...bapPayload } = data;
    const [newBap] = await db.insert(bap).values(bapPayload).returning();

    if (topikIds && topikIds.length > 0) {
      await db.insert(bapTopik).values(
        topikIds.map((topikId) => ({
          bapId: newBap.id,
          topikId,
          cpmkId: data.cpmkId || null,
        })),
      );
    }
    return newBap;
  }

  static async update(
    id: number,
    data: Partial<{
      tanggal: string;
      pertemuanKe: number;
      materi: string;
      catatan?: string | null;
      durasiMenit: number;
      cpmkId?: number | null;
      topikIds?: number[];
      dosenId: number;
    }>,
  ) {
    const { topikIds, ...bapPayload } = data;
    const [updatedBap] = await db.update(bap).set(bapPayload).where(eq(bap.id, id)).returning();

    if (topikIds !== undefined) {
      await db.delete(bapTopik).where(eq(bapTopik.bapId, id));
      if (topikIds.length > 0) {
        await db.insert(bapTopik).values(
          topikIds.map((topikId) => ({
            bapId: id,
            topikId,
            cpmkId: data.cpmkId || null,
          })),
        );
      }
    }
    return updatedBap || null;
  }
}

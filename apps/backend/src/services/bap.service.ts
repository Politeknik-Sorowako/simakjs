import { eq, inArray } from 'drizzle-orm';
import { bap, bapTopik, cpmk, dosen, dosenPengajarKelas, kelasKuliah, rps, rpsTopik } from '../models/schema';
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
    const { topikIds, ...rawPayload } = data;

    const kelasId = Number(rawPayload.kelasKuliahId);
    const existingKelas = await db.query.kelasKuliah.findFirst({ where: eq(kelasKuliah.id, kelasId) });
    if (!existingKelas) {
      throw new Error(`Kelas Kuliah dengan ID ${kelasId} tidak ditemukan di sistem.`);
    }

    // Sanitize cpmkId
    let validCpmkId: number | null = null;
    if (rawPayload.cpmkId) {
      const cId = Number(rawPayload.cpmkId);
      if (!isNaN(cId) && cId > 0) {
        const existingCpmk = await db.query.cpmk.findFirst({ where: eq(cpmk.id, cId) });
        if (existingCpmk) {
          validCpmkId = existingCpmk.id;
        }
      }
    }

    // Sanitize dosenId
    let validDosenId: number | null = null;
    if (rawPayload.dosenId) {
      const dId = Number(rawPayload.dosenId);
      if (!isNaN(dId) && dId > 0) {
        const existingDosen = await db.query.dosen.findFirst({ where: eq(dosen.id, dId) });
        if (existingDosen) {
          validDosenId = existingDosen.id;
        }
      }
    }

    if (!validDosenId) {
      const teachingDosen = await this.getFirstTeachingDosen(kelasId);
      if (teachingDosen) {
        validDosenId = teachingDosen.dosenId;
      } else {
        const anyD = await this.getAnyDosen();
        if (anyD) {
          validDosenId = anyD.id;
        }
      }
    }

    if (!validDosenId) {
      throw new Error('Dosen pengajar atau profil dosen tidak ditemukan di sistem.');
    }

    const bapPayload: {
      kelasKuliahId: number;
      tanggal: string;
      pertemuanKe: number;
      materi: string;
      durasiMenit: number;
      dosenId: number;
      catatan?: string;
      cpmkId?: number;
    } = {
      kelasKuliahId: kelasId,
      tanggal: String(rawPayload.tanggal || new Date().toISOString().split('T')[0]),
      pertemuanKe: Number(rawPayload.pertemuanKe) || 1,
      materi: String(rawPayload.materi || '').trim() || 'Materi Perkuliahan RPS',
      durasiMenit: Number(rawPayload.durasiMenit) || 100,
      dosenId: validDosenId,
    };

    if (rawPayload.catatan && String(rawPayload.catatan).trim() !== '') {
      bapPayload.catatan = String(rawPayload.catatan).trim();
    }

    if (validCpmkId) {
      bapPayload.cpmkId = validCpmkId;
    }

    const [newBap] = await db.insert(bap).values(bapPayload).returning();

    if (topikIds && Array.isArray(topikIds) && topikIds.length > 0) {
      const numericTopikIds = topikIds.map((id) => Number(id)).filter((id) => !isNaN(id) && id > 0);
      if (numericTopikIds.length > 0) {
        const validRpsTopiks = await db.select().from(rpsTopik).where(inArray(rpsTopik.id, numericTopikIds));
        const validIds = validRpsTopiks.map((t) => t.id);

        if (validIds.length > 0) {
          await db.insert(bapTopik).values(
            validIds.map((topikId) => ({
              bapId: newBap.id,
              topikId,
              cpmkId: validCpmkId,
            })),
          );
        }
      }
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

    // Validate cpmkId existence if provided
    if (bapPayload.cpmkId) {
      const existingCpmk = await db.query.cpmk.findFirst({ where: eq(cpmk.id, bapPayload.cpmkId) });
      if (!existingCpmk) {
        bapPayload.cpmkId = null;
      }
    }

    // Validate dosenId existence if provided
    if (bapPayload.dosenId) {
      const existingDosen = await db.query.dosen.findFirst({ where: eq(dosen.id, bapPayload.dosenId) });
      if (!existingDosen) {
        delete bapPayload.dosenId;
      }
    }

    const [updatedBap] = await db.update(bap).set(bapPayload).where(eq(bap.id, id)).returning();

    if (topikIds !== undefined && updatedBap) {
      await db.delete(bapTopik).where(eq(bapTopik.bapId, id));
      if (topikIds.length > 0) {
        const validRpsTopiks = await db.select().from(rpsTopik).where(inArray(rpsTopik.id, topikIds));
        const validTopikIds = validRpsTopiks.map((t) => t.id);

        if (validTopikIds.length > 0) {
          await db.insert(bapTopik).values(
            validTopikIds.map((topikId) => ({
              bapId: id,
              topikId,
              cpmkId: updatedBap.cpmkId || null,
            })),
          );
        }
      }
    }
    return updatedBap || null;
  }
}

import { eq } from 'drizzle-orm';
import { bap, dosen, dosenPengajarKelas, kelasKuliah, rps, rpsTopik } from '../models/schema';
import { db } from '../utils/db';

export class BapService {
  static async getByKelas(kelasKuliahId: number) {
    return await db.select().from(bap).where(eq(bap.kelasKuliahId, kelasKuliahId));
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
    durasiMenit: number;
    cpmkId: number;
    dosenId: number;
  }) {
    const [newBap] = await db.insert(bap).values(data).returning();
    return newBap;
  }

  static async update(
    id: number,
    data: Partial<{
      tanggal: string;
      pertemuanKe: number;
      materi: string;
      durasiMenit: number;
      cpmkId: number;
      dosenId: number;
    }>,
  ) {
    const [updatedBap] = await db.update(bap).set(data).where(eq(bap.id, id)).returning();
    return updatedBap || null;
  }
}

import { eq } from 'drizzle-orm';
import { cpmk } from '../models/schema';
import { db } from '../utils/db';

export class CpmkService {
  static async getByMataKuliah(mataKuliahId: number) {
    return await db.query.cpmk.findMany({
      where: eq(cpmk.mataKuliahId, mataKuliahId),
      with: {
        subCpmk: { orderBy: (sc, { asc }) => [asc(sc.urutan)] },
        cplMappings: {
          with: { cpl: true },
        },
      },
    });
  }

  static async getById(id: number) {
    return await db.query.cpmk.findFirst({
      where: eq(cpmk.id, id),
      with: {
        mataKuliah: true,
        subCpmk: { orderBy: (sc, { asc }) => [asc(sc.urutan)] },
        cplMappings: {
          with: { cpl: true },
        },
      },
    });
  }

  static async create(data: {
    mataKuliahId: number;
    kurikulumMataKuliahId?: number | null;
    kode: string;
    deskripsi: string;
  }) {
    const [newCpmk] = await db.insert(cpmk).values(data).returning();
    return newCpmk;
  }

  static async update(id: number, data: { kode?: string; deskripsi?: string; kurikulumMataKuliahId?: number | null }) {
    const [updated] = await db.update(cpmk).set(data).where(eq(cpmk.id, id)).returning();
    return updated || null;
  }

  static async delete(id: number) {
    const [deleted] = await db.delete(cpmk).where(eq(cpmk.id, id)).returning();
    return deleted || null;
  }
}

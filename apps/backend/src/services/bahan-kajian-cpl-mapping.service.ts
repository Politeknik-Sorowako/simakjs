import { and, eq } from 'drizzle-orm';
import { bahanKajian, bahanKajianCpl, cpl } from '../models/schema';
import { db } from '../utils/db';

export interface CreateBahanKajianCplMappingDto {
  bahanKajianId: number;
  cplId: number;
  bobot?: number | null;
}

export class BahanKajianCplMappingService {
  static async getAll(bahanKajianId?: number, cplId?: number, prodiId?: number) {
    const conditions = [];
    if (bahanKajianId) conditions.push(eq(bahanKajianCpl.bahanKajianId, bahanKajianId));
    if (cplId) conditions.push(eq(bahanKajianCpl.cplId, cplId));

    if (prodiId) {
      const bkIds = await db.query.bahanKajian.findMany({
        where: eq(bahanKajian.programStudiId, prodiId),
        columns: { id: true },
      });
      const bkIdList = bkIds.map((bk) => bk.id);
      if (bkIdList.length === 0) return [];
      conditions.push(eq(bahanKajianCpl.bahanKajianId, bkIdList[0]));
    }

    return db.query.bahanKajianCpl.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        bahanKajian: true,
        cpl: true,
      },
    });
  }

  static async create(data: CreateBahanKajianCplMappingDto) {
    const [newData] = await db
      .insert(bahanKajianCpl)
      .values({ ...data, bobot: data.bobot ? data.bobot.toString() : null })
      .returning();
    return newData;
  }

  static async delete(id: number) {
    const [deleted] = await db.delete(bahanKajianCpl).where(eq(bahanKajianCpl.id, id)).returning();
    return deleted || null;
  }

  static async getMatriks(prodiId: number) {
    const allBk = await db.query.bahanKajian.findMany({
      where: eq(bahanKajian.programStudiId, prodiId),
      orderBy: bahanKajian.urutan,
    });

    const allCpl = await db.query.cpl.findMany({
      where: eq(cpl.programStudiId, prodiId),
      orderBy: cpl.urutan,
    });

    const mappings = await db.query.bahanKajianCpl.findMany({
      with: {
        bahanKajian: true,
        cpl: true,
      },
    });

    const matriks: {
      bk: (typeof allBk)[0];
      bobotPerCpl: { cplId: number; bobot: number }[];
    }[] = allBk.map((bk) => {
      const bobotPerCpl = allCpl.map((c) => {
        const mapping = mappings.find((m) => m.bahanKajianId === bk.id && m.cplId === c.id);
        const rawBobot = mapping ? parseFloat(mapping.bobot || '0') : 0;
        const totalBobotBk = allCpl
          .map((c2) => {
            const m2 = mappings.find((m) => m.bahanKajianId === bk.id && m.cplId === c2.id);
            return m2 ? parseFloat(m2.bobot || '0') : 0;
          })
          .reduce((s, v) => s + v, 0);

        return {
          cplId: c.id,
          bobot: totalBobotBk > 0 ? rawBobot / totalBobotBk : allCpl.length > 0 ? 1 / allCpl.length : 0,
        };
      });
      return { bk: bk, bobotPerCpl };
    });

    return { bk: allBk, cpl: allCpl, matriks };
  }
}

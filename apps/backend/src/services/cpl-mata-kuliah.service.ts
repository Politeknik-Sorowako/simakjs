import { and, eq, inArray } from 'drizzle-orm';
import { cpl, cplMataKuliah, kurikulum, kurikulumMataKuliah, mataKuliah } from '../models/schema';
import { db } from '../utils/db';

export interface CreateCplMataKuliahDto {
  cplId: number;
  mataKuliahId: number;
  bobot?: number | null;
}

export class CplMataKuliahService {
  static async getAll(cplId?: number, mataKuliahId?: number, kurikulumId?: number) {
    const conditions = [];
    if (cplId) conditions.push(eq(cplMataKuliah.cplId, cplId));
    if (mataKuliahId) conditions.push(eq(cplMataKuliah.mataKuliahId, mataKuliahId));

    if (kurikulumId) {
      const kmkList = await db.query.kurikulumMataKuliah.findMany({
        where: eq(kurikulumMataKuliah.kurikulumId, kurikulumId),
        columns: { mataKuliahId: true },
      });
      const mkIds = kmkList.map((k) => k.mataKuliahId);
      if (mkIds.length === 0) return [];
      conditions.push(inArray(cplMataKuliah.mataKuliahId, mkIds));
    }

    return db.query.cplMataKuliah.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        cpl: true,
        mataKuliah: true,
      },
    });
  }

  static async create(data: CreateCplMataKuliahDto) {
    const [newData] = await db
      .insert(cplMataKuliah)
      .values({ ...data, bobot: data.bobot ? data.bobot.toString() : null })
      .returning();
    return newData;
  }

  static async update(id: number, data: { bobot?: number | null }) {
    const [updated] = await db
      .update(cplMataKuliah)
      .set({ bobot: data.bobot ? data.bobot.toString() : null, updatedAt: new Date() })
      .where(eq(cplMataKuliah.id, id))
      .returning();
    return updated || null;
  }

  static async delete(id: number) {
    const [deleted] = await db.delete(cplMataKuliah).where(eq(cplMataKuliah.id, id)).returning();
    return deleted || null;
  }

  static async getMatriks(kurikulumId: number) {
    const kur = await db.query.kurikulum.findFirst({
      where: eq(kurikulum.id, kurikulumId),
    });
    if (!kur) throw new Error('Kurikulum tidak ditemukan');

    const cplList = await db.query.cpl.findMany({
      where: eq(cpl.programStudiId, kur.programStudiId),
      orderBy: cpl.urutan,
    });

    const mkInKurikulum = await db.query.kurikulumMataKuliah.findMany({
      where: eq(kurikulumMataKuliah.kurikulumId, kurikulumId),
      with: { mataKuliah: true },
    });

    const mkIds = mkInKurikulum.map((kmk) => kmk.mataKuliahId);
    const cplIds = cplList.map((c) => c.id);

    if (cplIds.length === 0 || mkIds.length === 0) {
      return { cpl: cplList, mataKuliah: mkInKurikulum.map((k) => k.mataKuliah), matriks: [] };
    }

    const mappings = await db.query.cplMataKuliah.findMany({
      where: and(inArray(cplMataKuliah.cplId, cplIds), inArray(cplMataKuliah.mataKuliahId, mkIds)),
    });

    const matriks = cplList.map((c) => {
      const bobotPerMk = mkInKurikulum.map((kmk) => {
        const mapping = mappings.find((m) => m.cplId === c.id && m.mataKuliahId === kmk.mataKuliahId);
        const rawBobot = mapping ? parseFloat(mapping.bobot || '0') : 0;
        const totalBobotCpl = mkInKurikulum
          .map((kmk2) => {
            const m2 = mappings.find((m) => m.cplId === c.id && m.mataKuliahId === kmk2.mataKuliahId);
            return m2 ? parseFloat(m2.bobot || '0') : 0;
          })
          .reduce((s, v) => s + v, 0);

        return {
          mataKuliahId: kmk.mataKuliahId,
          bobot: totalBobotCpl > 0 ? rawBobot / totalBobotCpl : mkInKurikulum.length > 0 ? 1 / mkInKurikulum.length : 0,
          bobotRaw: rawBobot,
        };
      });
      return { cpl: c, bobotPerMk };
    });

    return {
      cpl: cplList,
      mataKuliah: mkInKurikulum.map((k) => k.mataKuliah),
      matriks,
    };
  }

  static async validateTotalBobotPerCpl(cplId: number) {
    const mappings = await db.query.cplMataKuliah.findMany({
      where: eq(cplMataKuliah.cplId, cplId),
    });
    const total = mappings.reduce((s, m) => s + parseFloat(m.bobot || '0'), 0);
    return { total, isValid: Math.abs(total - 100) < 0.01 };
  }
}

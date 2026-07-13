import { and, eq, inArray } from 'drizzle-orm';
import { cpl, cplProfilLulusan, profilLulusan } from '../models/schema';
import { db } from '../utils/db';

export interface CreateCplMappingDto {
  cplId: number;
  profilLulusanId: number;
  bobot?: number | null;
}

export class CplMappingService {
  static async getAll(prodiId?: number, filterCplId?: number, filterProfilLulusanId?: number) {
    const conditions = [];
    if (filterCplId) conditions.push(eq(cplProfilLulusan.cplId, filterCplId));
    if (filterProfilLulusanId) conditions.push(eq(cplProfilLulusan.profilLulusanId, filterProfilLulusanId));

    if (prodiId) {
      const cplIds = await db.query.cpl.findMany({
        where: eq(cpl.programStudiId, prodiId),
        columns: { id: true },
      });
      const cplIdList = cplIds.map((c) => c.id);
      if (cplIdList.length === 0) return [];
      conditions.push(inArray(cplProfilLulusan.cplId, cplIdList));
    }

    return db.query.cplProfilLulusan.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        cpl: true,
        profilLulusan: true,
      },
    });
  }

  static async create(data: CreateCplMappingDto) {
    const [newData] = await db
      .insert(cplProfilLulusan)
      .values({ ...data, bobot: data.bobot ? data.bobot.toString() : null })
      .returning();
    return newData;
  }

  static async delete(id: number) {
    const [deleted] = await db.delete(cplProfilLulusan).where(eq(cplProfilLulusan.id, id)).returning();
    return deleted || null;
  }

  static async getMatriks(prodiId: number) {
    const allCpl = await db.query.cpl.findMany({
      where: eq(cpl.programStudiId, prodiId),
      orderBy: cpl.urutan,
    });

    const allPl = await db.query.profilLulusan.findMany({
      where: eq(profilLulusan.programStudiId, prodiId),
      orderBy: profilLulusan.urutan,
    });

    const cplIds = allCpl.map((c) => c.id);
    const plIds = allPl.map((pl) => pl.id);

    if (cplIds.length === 0 || plIds.length === 0) {
      return { cpl: allCpl, profilLulusan: allPl, matriks: [] };
    }

    const mappings = await db.query.cplProfilLulusan.findMany({
      where: and(inArray(cplProfilLulusan.cplId, cplIds), inArray(cplProfilLulusan.profilLulusanId, plIds)),
      with: {
        cpl: true,
        profilLulusan: true,
      },
    });

    const matriks: {
      cpl: (typeof allCpl)[0];
      bobotPerPl: { profilLulusanId: number; bobot: number }[];
    }[] = allCpl.map((c) => {
      const bobotPerPl = allPl.map((pl) => {
        const mapping = mappings.find((m) => m.cplId === c.id && m.profilLulusanId === pl.id);
        const rawBobot = mapping ? parseFloat(mapping.bobot || '0') : 0;
        const totalBobotCpl = allPl
          .map((pl2) => {
            const m2 = mappings.find((m) => m.cplId === c.id && m.profilLulusanId === pl2.id);
            return m2 ? parseFloat(m2.bobot || '0') : 0;
          })
          .reduce((s, v) => s + v, 0);

        return {
          profilLulusanId: pl.id,
          bobot: totalBobotCpl > 0 ? rawBobot / totalBobotCpl : allPl.length > 0 ? 1 / allPl.length : 0,
        };
      });
      return { cpl: c, bobotPerPl };
    });

    return { cpl: allCpl, profilLulusan: allPl, matriks };
  }
}

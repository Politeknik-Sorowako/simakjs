import { and, eq, inArray } from 'drizzle-orm';
import { cpl, cpmk, cpmkCpl, kurikulumMataKuliah, mataKuliah } from '../models/schema';
import { db } from '../utils/db';

export interface CreateCpmkCplMappingDto {
  cpmkId: number;
  cplId: number;
  bobot?: number | null;
}

export class CpmkCplMappingService {
  static async getAll(cpmkId?: number, cplId?: number) {
    const conditions = [];
    if (cpmkId) conditions.push(eq(cpmkCpl.cpmkId, cpmkId));
    if (cplId) conditions.push(eq(cpmkCpl.cplId, cplId));

    return db.query.cpmkCpl.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        cpmk: { with: { mataKuliah: true } },
        cpl: true,
      },
    });
  }

  static async create(data: CreateCpmkCplMappingDto) {
    const [newData] = await db
      .insert(cpmkCpl)
      .values({ ...data, bobot: data.bobot ? data.bobot.toString() : null })
      .returning();
    return newData;
  }

  static async delete(id: number) {
    const [deleted] = await db.delete(cpmkCpl).where(eq(cpmkCpl.id, id)).returning();
    return deleted || null;
  }

  static async getMatriksPerCpmk(cplId: number) {
    const mappings = await db.query.cpmkCpl.findMany({
      where: eq(cpmkCpl.cplId, cplId),
      with: {
        cpmk: { with: { mataKuliah: true } },
      },
    });

    return mappings.map((m) => ({
      ...m,
      bobot: m.bobot ? parseFloat(m.bobot) : null,
    }));
  }

  static async getMatriks(kurikulumId: number) {
    const cplList = await db.query.cpl.findMany({
      with: {
        cpmkMappings: {
          with: {
            cpmk: {
              with: { mataKuliah: true },
            },
          },
        },
      },
    });

    const mkInKurikulum = await db.query.kurikulumMataKuliah.findMany({
      where: eq(kurikulumMataKuliah.kurikulumId, kurikulumId),
      with: { mataKuliah: true },
    });

    const mkIds = mkInKurikulum.map((mk) => mk.mataKuliahId);
    const cpmkInKurikulum = await db.query.cpmk.findMany({
      where: inArray(cpmk.mataKuliahId, mkIds),
      with: { mataKuliah: true },
    });

    const result = cplList.map((c) => {
      const cpmkMappings = c.cpmkMappings
        .filter((m) => cpmkInKurikulum.some((ck) => ck.id === m.cpmkId))
        .map((m) => ({
          ...m,
          bobot: m.bobot ? parseFloat(m.bobot) : null,
        }));

      const totalBobot = cpmkMappings.reduce((s, m) => s + (m.bobot || 0), 0);

      return {
        cpl: { id: c.id, kode: c.kode, deskripsi: c.deskripsi },
        totalBobot,
        cpmkMappings: cpmkMappings.map((m) => ({
          cpmkId: m.cpmkId,
          kode: m.cpmk.kode,
          deskripsi: m.cpmk.deskripsi,
          mataKuliah: m.cpmk.mataKuliah
            ? { id: m.cpmk.mataKuliah.id, kode: m.cpmk.mataKuliah.kode, nama: m.cpmk.mataKuliah.nama }
            : null,
          bobot: m.bobot,
          bobotNormalisasi:
            totalBobot > 0 && m.bobot ? m.bobot / totalBobot : cpmkMappings.length > 0 ? 1 / cpmkMappings.length : 0,
        })),
      };
    });

    const allMk = cpmkInKurikulum.map((ck) => ({
      id: ck.id,
      kode: ck.kode,
      deskripsi: ck.deskripsi,
      mataKuliah: ck.mataKuliah,
    }));

    return { cpl: cplList, mataKuliahCpmk: allMk, matriks: result };
  }
}

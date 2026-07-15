import { and, count, eq, ilike, inArray, or } from 'drizzle-orm';
import { cpmk, kurikulum, kurikulumMataKuliah, mataKuliah } from '../models/schema';
import { db } from '../utils/db';

export class CpmkService {
  static async getAll(page = 1, limit = 10, search = '', kurikulumId?: number, mataKuliahId?: number) {
    const offset = (page - 1) * limit;
    let conditions = [];

    if (search) {
      conditions.push(or(ilike(cpmk.kode, `%${search}%`), ilike(cpmk.deskripsi, `%${search}%`)));
    }

    if (mataKuliahId) {
      conditions.push(eq(cpmk.mataKuliahId, mataKuliahId));
    }

    if (kurikulumId) {
      const kmkIds = db
        .select({ mkId: kurikulumMataKuliah.mataKuliahId })
        .from(kurikulumMataKuliah)
        .where(eq(kurikulumMataKuliah.kurikulumId, kurikulumId));
      conditions.push(inArray(cpmk.mataKuliahId, kmkIds));
    }

    let whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db.select({ total: count() }).from(cpmk).where(whereClause);
    const total = totalResult?.total || 0;

    const data = await db.query.cpmk.findMany({
      where: whereClause,
      limit,
      offset,
      orderBy: (c, { asc }) => [asc(c.kode)],
      with: {
        mataKuliah: true,
        subCpmk: { orderBy: (sc, { asc }) => [asc(sc.urutan)] },
        cplMappings: {
          with: { cpl: true },
        },
      },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

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
    if (data.kurikulumMataKuliahId) {
      const kmk = await db.query.kurikulumMataKuliah.findFirst({
        where: eq(kurikulumMataKuliah.id, data.kurikulumMataKuliahId),
      });
      if (!kmk || kmk.mataKuliahId !== data.mataKuliahId) {
        throw new Error('Kurikulum Mata Kuliah tidak sesuai dengan Mata Kuliah yang dipilih');
      }
    }

    const [newCpmk] = await db.insert(cpmk).values(data).returning();
    return newCpmk;
  }

  static async update(id: number, data: { kode?: string; deskripsi?: string; kurikulumMataKuliahId?: number | null }) {
    if (data.kurikulumMataKuliahId !== undefined) {
      const existing = await db.query.cpmk.findFirst({ where: eq(cpmk.id, id) });
      if (existing && data.kurikulumMataKuliahId) {
        const kmk = await db.query.kurikulumMataKuliah.findFirst({
          where: eq(kurikulumMataKuliah.id, data.kurikulumMataKuliahId),
        });
        if (!kmk || kmk.mataKuliahId !== existing.mataKuliahId) {
          throw new Error('Kurikulum Mata Kuliah tidak sesuai dengan Mata Kuliah yang dipilih');
        }
      }
    }

    const [updated] = await db.update(cpmk).set(data).where(eq(cpmk.id, id)).returning();
    return updated || null;
  }

  static async delete(id: number) {
    const [deleted] = await db.delete(cpmk).where(eq(cpmk.id, id)).returning();
    return deleted || null;
  }
}

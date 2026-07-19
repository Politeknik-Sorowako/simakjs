import { and, count, eq, ilike, inArray, or } from 'drizzle-orm';
import { cpmk, kurikulum, kurikulumMataKuliah, mataKuliah } from '../models/schema';
import { db } from '../utils/db';

export interface ImportCpmkItem {
  kodeMataKuliah?: string;
  kode: string;
  deskripsi: string;
}

export interface ImportCpmkResult {
  success: number;
  failed: number;
  errors: { row: number; kode: string; error: string }[];
}

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
      data: data.map((d) => ({
        ...d,
        bobotMk: d.bobotMk ? parseFloat(d.bobotMk) : null,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  static async getByMataKuliah(mataKuliahId: number) {
    const data = await db.query.cpmk.findMany({
      where: eq(cpmk.mataKuliahId, mataKuliahId),
      with: {
        subCpmk: { orderBy: (sc, { asc }) => [asc(sc.urutan)] },
        cplMappings: {
          with: { cpl: true },
        },
      },
    });
    return data.map((d) => ({
      ...d,
      bobotMk: d.bobotMk ? parseFloat(d.bobotMk) : null,
    }));
  }

  static async getById(id: number) {
    const data = await db.query.cpmk.findFirst({
      where: eq(cpmk.id, id),
      with: {
        mataKuliah: true,
        subCpmk: { orderBy: (sc, { asc }) => [asc(sc.urutan)] },
        cplMappings: {
          with: { cpl: true },
        },
      },
    });
    if (!data) return null;
    return {
      ...data,
      bobotMk: data.bobotMk ? parseFloat(data.bobotMk) : null,
    };
  }

  static async create(data: {
    mataKuliahId: number;
    kurikulumMataKuliahId?: number | null;
    kode: string;
    deskripsi: string;
    bobotMk?: number | null;
  }) {
    if (data.kurikulumMataKuliahId) {
      const kmk = await db.query.kurikulumMataKuliah.findFirst({
        where: eq(kurikulumMataKuliah.id, data.kurikulumMataKuliahId),
      });
      if (!kmk || kmk.mataKuliahId !== data.mataKuliahId) {
        throw new Error('Kurikulum Mata Kuliah tidak sesuai dengan Mata Kuliah yang dipilih');
      }
    }

    const [newCpmk] = await db
      .insert(cpmk)
      .values({
        ...data,
        bobotMk: data.bobotMk ? data.bobotMk.toString() : null,
      })
      .returning();
    return {
      ...newCpmk,
      bobotMk: newCpmk.bobotMk ? parseFloat(newCpmk.bobotMk) : null,
    };
  }

  static async update(
    id: number,
    data: { kode?: string; deskripsi?: string; kurikulumMataKuliahId?: number | null; bobotMk?: number | null },
  ) {
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

    const updateData: Record<string, unknown> = {};
    if (data.kode !== undefined) updateData.kode = data.kode;
    if (data.deskripsi !== undefined) updateData.deskripsi = data.deskripsi;
    if (data.kurikulumMataKuliahId !== undefined) updateData.kurikulumMataKuliahId = data.kurikulumMataKuliahId;
    if (data.bobotMk !== undefined) updateData.bobotMk = data.bobotMk ? data.bobotMk.toString() : null;

    const [updated] = await db.update(cpmk).set(updateData).where(eq(cpmk.id, id)).returning();
    if (!updated) return null;
    return {
      ...updated,
      bobotMk: updated.bobotMk ? parseFloat(updated.bobotMk) : null,
    };
  }

  static async delete(id: number) {
    const [deleted] = await db.delete(cpmk).where(eq(cpmk.id, id)).returning();
    return deleted || null;
  }

  static async validateTotalBobotMk(mataKuliahId: number) {
    const cpmkList = await db.query.cpmk.findMany({
      where: eq(cpmk.mataKuliahId, mataKuliahId),
    });
    const total = cpmkList.reduce((s, c) => s + parseFloat(c.bobotMk || '0'), 0);
    return { total, isValid: Math.abs(total - 100) < 0.01, jumlahCpmk: cpmkList.length };
  }

  static async import(items: ImportCpmkItem[]): Promise<ImportCpmkResult> {
    const result: ImportCpmkResult = { success: 0, failed: 0, errors: [] };

    const uniqueKodes = [...new Set(items.map((item) => item.kodeMataKuliah).filter((k): k is string => !!k))];
    let kodeToId = new Map<string, number>();
    if (uniqueKodes.length > 0) {
      const mkList = await db
        .select({ id: mataKuliah.id, kode: mataKuliah.kode })
        .from(mataKuliah)
        .where(inArray(mataKuliah.kode, uniqueKodes));
      kodeToId = new Map(mkList.map((m) => [m.kode, m.id]));
    }

    const validItems: { kode: string; deskripsi: string; resolvedMkId: number }[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const urutan = i + 1;
      const kode = item.kode?.trim();
      const deskripsi = item.deskripsi?.trim();

      let resolvedMkId: number | undefined;
      if (item.kodeMataKuliah) {
        const found = kodeToId.get(item.kodeMataKuliah);
        if (!found) {
          result.failed++;
          result.errors.push({
            row: urutan,
            kode: kode || '',
            error: `Mata Kuliah dengan kode '${item.kodeMataKuliah}' tidak ditemukan`,
          });
          continue;
        }
        resolvedMkId = found;
      } else {
        result.failed++;
        result.errors.push({ row: urutan, kode: kode || '', error: 'kode_mata_kuliah wajib diisi' });
        continue;
      }

      if (!kode || !deskripsi) {
        result.failed++;
        result.errors.push({ row: urutan, kode: kode || '', error: 'Kode dan deskripsi wajib diisi' });
        continue;
      }

      if (kode.length > 50) {
        result.failed++;
        result.errors.push({ row: urutan, kode, error: 'Kode maksimal 50 karakter' });
        continue;
      }

      const existing = await db.query.cpmk.findFirst({
        where: and(eq(cpmk.mataKuliahId, resolvedMkId), eq(cpmk.kode, kode)),
      });

      if (existing) {
        result.failed++;
        result.errors.push({ row: urutan, kode, error: 'Kode sudah ada untuk mata kuliah ini' });
        continue;
      }

      validItems.push({ kode, deskripsi, resolvedMkId });
    }

    if (validItems.length > 0) {
      try {
        await db.transaction(async (tx) => {
          await tx.insert(cpmk).values(
            validItems.map((item) => ({
              mataKuliahId: item.resolvedMkId,
              kode: item.kode,
              deskripsi: item.deskripsi,
            })),
          );
        });
        result.success = validItems.length;
      } catch (err: unknown) {
        result.failed += validItems.length;
        result.errors.push({
          row: 0,
          kode: '',
          error: 'Gagal menyimpan data ke database',
        });
        console.error('CPMK import error:', err);
      }
    }

    return result;
  }

  static getTemplateCsv(): string {
    return 'kode_mata_kuliah,kode,deskripsi\nTI001,CPMK-01,Mampu menerapkan konsep dasar pemrograman\nTI001,CPMK-02,Mampu menganalisis kebutuhan sistem\nTI002,CPMK-01,Mampu merancang basis data relasional';
  }
}

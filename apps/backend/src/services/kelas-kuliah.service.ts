import { and, count, eq, ilike, inArray, or } from 'drizzle-orm';
import { kelasKuliah, mataKuliah } from '../models/schema';
import { db } from '../utils/db';

export interface CreateKelasDto {
  mataKuliahId: number;
  periodeId: string;
  namaKelas: string;
  idPddikti?: string;
}

export interface ImportKelasItem {
  kodeMataKuliah?: string;
  periodeId: string;
  namaKelas: string;
  idPddikti?: string;
}

export interface ImportKelasResult {
  success: number;
  failed: number;
  errors: { row: number; namaKelas: string; error: string }[];
}

export class KelasKuliahService {
  static async getAll(page = 1, limit = 10, search = '', periodeId?: string) {
    const offset = (page - 1) * limit;
    let conditions = [];

    if (search) {
      conditions.push(or(ilike(kelasKuliah.namaKelas, `%${search}%`), ilike(kelasKuliah.periodeId, `%${search}%`)));
    }
    if (periodeId) {
      conditions.push(eq(kelasKuliah.periodeId, periodeId));
    }

    let whereClause = undefined;
    if (conditions.length > 0) {
      whereClause = and(...conditions);
    }

    const [totalResult] = await db.select({ total: count() }).from(kelasKuliah).where(whereClause);

    const total = totalResult?.total || 0;

    const data = await db.query.kelasKuliah.findMany({
      where: whereClause,
      limit,
      offset,
      with: {
        mataKuliah: true,
        periodeAkademik: true,
        dosenPengajarKelas: {
          with: {
            dosen: true,
          },
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

  static async getById(id: number) {
    const data = await db.query.kelasKuliah.findFirst({
      where: eq(kelasKuliah.id, id),
      with: {
        mataKuliah: true,
        periodeAkademik: true,
        dosenPengajarKelas: {
          with: {
            dosen: true,
          },
        },
      },
    });
    return data || null;
  }

  static async create(data: CreateKelasDto) {
    const [newKelas] = await db.insert(kelasKuliah).values(data).returning();
    return newKelas;
  }

  static async update(id: number, data: Partial<CreateKelasDto>) {
    const [updatedKelas] = await db.update(kelasKuliah).set(data).where(eq(kelasKuliah.id, id)).returning();
    return updatedKelas || null;
  }

  static async getByMk(mataKuliahId: number, periodeId: string) {
    return await db.query.kelasKuliah.findMany({
      where: and(eq(kelasKuliah.mataKuliahId, mataKuliahId), eq(kelasKuliah.periodeId, periodeId)),
      with: {
        dosenPengajarKelas: {
          with: {
            dosen: true,
          },
        },
      },
    });
  }

  static async delete(id: number) {
    const [deletedKelas] = await db.delete(kelasKuliah).where(eq(kelasKuliah.id, id)).returning();
    return deletedKelas || null;
  }

  static async import(items: ImportKelasItem[]): Promise<ImportKelasResult> {
    const result: ImportKelasResult = { success: 0, failed: 0, errors: [] };

    const uniqueMkKodes = [...new Set(items.map((item) => item.kodeMataKuliah).filter((k): k is string => !!k))];
    let mkKodeToId = new Map<string, number>();
    if (uniqueMkKodes.length > 0) {
      const mkList = await db
        .select({ id: mataKuliah.id, kode: mataKuliah.kode })
        .from(mataKuliah)
        .where(inArray(mataKuliah.kode, uniqueMkKodes));
      mkKodeToId = new Map(mkList.map((m) => [m.kode, m.id]));
    }

    const validItems: { mataKuliahId: number; periodeId: string; namaKelas: string; idPddikti?: string }[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const urutan = i + 1;
      const namaKelas = item.namaKelas?.trim() || '';

      if (!item.kodeMataKuliah) {
        result.failed++;
        result.errors.push({ row: urutan, namaKelas, error: 'kode_mata_kuliah wajib diisi' });
        continue;
      }

      const mkId = mkKodeToId.get(item.kodeMataKuliah);
      if (!mkId) {
        result.failed++;
        result.errors.push({
          row: urutan,
          namaKelas,
          error: `Mata Kuliah dengan kode '${item.kodeMataKuliah}' tidak ditemukan`,
        });
        continue;
      }

      if (!item.periodeId?.trim()) {
        result.failed++;
        result.errors.push({ row: urutan, namaKelas, error: 'periode_id wajib diisi' });
        continue;
      }

      if (!namaKelas) {
        result.failed++;
        result.errors.push({ row: urutan, namaKelas, error: 'nama_kelas wajib diisi' });
        continue;
      }

      if (namaKelas.length > 50) {
        result.failed++;
        result.errors.push({ row: urutan, namaKelas, error: 'nama_kelas maksimal 50 karakter' });
        continue;
      }

      const existing = await db.query.kelasKuliah.findFirst({
        where: and(eq(kelasKuliah.mataKuliahId, mkId), eq(kelasKuliah.namaKelas, namaKelas)),
      });

      if (existing) {
        result.failed++;
        result.errors.push({
          row: urutan,
          namaKelas,
          error: `Kelas '${namaKelas}' sudah ada untuk mata kuliah ini`,
        });
        continue;
      }

      validItems.push({
        mataKuliahId: mkId,
        periodeId: item.periodeId.trim(),
        namaKelas,
        idPddikti: item.idPddikti?.trim() || undefined,
      });
    }

    if (validItems.length > 0) {
      try {
        await db.transaction(async (tx) => {
          await tx.insert(kelasKuliah).values(validItems);
        });
        result.success = validItems.length;
      } catch (err: unknown) {
        result.failed += validItems.length;
        result.errors.push({ row: 0, namaKelas: '', error: 'Gagal menyimpan data ke database' });
        console.error('Kelas Kuliah import error:', err);
      }
    }

    return result;
  }

  static getTemplateCsv(): string {
    return 'kode_mata_kuliah,periode_id,nama_kelas,id_pddikti\nTI001,20241,4A,\nTI001,20241,4B,\nTI002,20241,1A,';
  }
}

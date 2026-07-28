import { and, count, eq, ilike, inArray, or } from 'drizzle-orm';
import { kurikulum, kurikulumMataKuliah, mataKuliah, programStudi } from '../models/schema';
import { db } from '../utils/db';

export interface CreateMataKuliahDto {
  programStudiId: number;
  kode: string;
  nama: string;
  sksTotal: number;
  sksTatapMuka?: number;
  sksPraktek?: number;
  idPddikti?: string;
}

export interface ImportMataKuliahItem {
  kodeProdi?: string;
  kode: string;
  nama: string;
  sksTotal: number;
  sksTatapMuka?: number;
  sksPraktek?: number;
  idPddikti?: string;
}

export interface ImportMataKuliahResult {
  success: number;
  failed: number;
  errors: { row: number; kode: string; error: string }[];
}

export class MataKuliahService {
  static async getAll(
    page = 1,
    limit = 10,
    search = '',
    programStudiId?: number,
    kurikulumId?: number,
    semester?: number,
    sortBy = 'nama',
    sortOrder: 'asc' | 'desc' = 'asc',
  ) {
    const offset = (page - 1) * limit;
    const conditions = [];

    if (programStudiId) {
      conditions.push(eq(mataKuliah.programStudiId, programStudiId));
    }

    if (search) {
      conditions.push(or(ilike(mataKuliah.nama, `%${search}%`), ilike(mataKuliah.kode, `%${search}%`)));
    }

    if (kurikulumId) {
      const kmkIds = db
        .select({ mkId: kurikulumMataKuliah.mataKuliahId })
        .from(kurikulumMataKuliah)
        .where(eq(kurikulumMataKuliah.kurikulumId, kurikulumId));
      conditions.push(inArray(mataKuliah.id, kmkIds));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Fast path: no kurikulum enrichment needed
    if (!kurikulumId && semester === undefined) {
      let orderField;
      switch (sortBy) {
        case 'kode':
          orderField = mataKuliah.kode;
          break;
        case 'sks':
          orderField = mataKuliah.sksTotal;
          break;
        default:
          orderField = mataKuliah.nama;
      }
      const orderDir = sortOrder === 'desc' ? 'desc' : 'asc';

      const [totalResult] = await db.select({ total: count() }).from(mataKuliah).where(whereClause);
      const total = totalResult?.total || 0;

      const data = await db.query.mataKuliah.findMany({
        where: whereClause,
        limit,
        offset,
        orderBy: (mk, { asc, desc }) => [orderDir === 'desc' ? desc(orderField) : asc(orderField)],
        with: { programStudi: true },
      });

      const totalPages = Math.ceil(total / limit);
      return {
        // biome-ignore lint/suspicious/noExplicitAny: Drizzle query result type transformation
        data: data.map((mk: any) => ({
          ...mk,
          semester: null,
          kurikulum: null,
          programStudi: mk.programStudi
            ? { id: mk.programStudi.id, kode: mk.programStudi.kode, nama: mk.programStudi.nama }
            : null,
        })),
        meta: { total, page, limit, totalPages },
      };
    }

    // Slow path: with kurikulum enrichment
    let allData = await db.query.mataKuliah.findMany({
      where: whereClause,
      with: { programStudi: true },
    });

    let kurikulumProdiInfo: { id: number; kode: string; nama: string } | null = null;
    if (kurikulumId) {
      const kur = await db.query.kurikulum.findFirst({
        where: eq(kurikulum.id, kurikulumId),
        with: { programStudi: true },
      });
      if (kur?.programStudi) {
        kurikulumProdiInfo = {
          id: kur.programStudi.id,
          kode: kur.programStudi.kode,
          nama: kur.programStudi.nama,
        };
      }

      const kmkRows = await db
        .select({
          mataKuliahId: kurikulumMataKuliah.mataKuliahId,
          semester: kurikulumMataKuliah.semester,
          kurikulumKode: kurikulum.kode,
          kurikulumNama: kurikulum.nama,
        })
        .from(kurikulumMataKuliah)
        .innerJoin(kurikulum, eq(kurikulumMataKuliah.kurikulumId, kurikulum.id))
        .where(eq(kurikulumMataKuliah.kurikulumId, kurikulumId));

      const kmkMap = new Map(
        kmkRows.map((r) => [r.mataKuliahId, { semester: r.semester, kode: r.kurikulumKode, nama: r.kurikulumNama }]),
      );

      // biome-ignore lint/suspicious/noExplicitAny: Drizzle query result type transformation
      allData = allData.map((mk: any) => {
        const info = kmkMap.get(mk.id);
        return {
          ...mk,
          semester: info?.semester ?? null,
          kurikulum: info ? { kode: info.kode, nama: info.nama } : null,
          programStudi: mk.programStudi
            ? { id: mk.programStudi.id, kode: mk.programStudi.kode, nama: mk.programStudi.nama }
            : kurikulumProdiInfo || null,
        };
      });
    } else {
      // biome-ignore lint/suspicious/noExplicitAny: Drizzle query result type transformation
      allData = allData.map((mk: any) => ({
        ...mk,
        semester: null,
        kurikulum: null,
        programStudi: mk.programStudi
          ? { id: mk.programStudi.id, kode: mk.programStudi.kode, nama: mk.programStudi.nama }
          : null,
      }));
    }

    if (semester !== undefined) {
      // biome-ignore lint/suspicious/noExplicitAny: Drizzle query result type transformation
      allData = allData.filter((mk: any) => mk.semester === semester);
    }

    const orderDir = sortOrder === 'desc' ? -1 : 1;
    // biome-ignore lint/suspicious/noExplicitAny: Drizzle query result type transformation
    allData.sort((a: any, b: any) => {
      let cmp = 0;
      switch (sortBy) {
        case 'kode':
          cmp = a.kode.localeCompare(b.kode);
          break;
        case 'sks':
          cmp = (a.sksTotal || 0) - (b.sksTotal || 0);
          break;
        case 'semester':
          cmp = (a.semester || 0) - (b.semester || 0);
          break;
        default:
          cmp = a.nama.localeCompare(b.nama);
      }
      return cmp * orderDir;
    });

    const total = allData.length;
    const data = allData.slice(offset, offset + limit);
    const totalPages = Math.ceil(total / limit);
    return { data, meta: { total, page, limit, totalPages } };
  }

  static async getById(id: number) {
    const data = await db.query.mataKuliah.findFirst({
      where: eq(mataKuliah.id, id),
      with: { programStudi: true },
    });
    return data || null;
  }

  static async create(data: CreateMataKuliahDto) {
    const [newMk] = await db.insert(mataKuliah).values(data).returning();
    return newMk;
  }

  static async update(id: number, data: Partial<CreateMataKuliahDto>) {
    const [updatedMk] = await db.update(mataKuliah).set(data).where(eq(mataKuliah.id, id)).returning();
    return updatedMk || null;
  }

  static async delete(id: number) {
    const [deletedMk] = await db.delete(mataKuliah).where(eq(mataKuliah.id, id)).returning();
    return deletedMk || null;
  }

  static async import(items: ImportMataKuliahItem[]): Promise<ImportMataKuliahResult> {
    const result: ImportMataKuliahResult = { success: 0, failed: 0, errors: [] };

    const uniqueProdiKodes = [...new Set(items.map((item) => item.kodeProdi?.trim()).filter((k): k is string => !!k))];
    let prodiKodeToId = new Map<string, number>();
    if (uniqueProdiKodes.length > 0) {
      const prodiList = await db
        .select({ id: programStudi.id, kode: programStudi.kode })
        .from(programStudi)
        .where(inArray(programStudi.kode, uniqueProdiKodes));
      prodiKodeToId = new Map(prodiList.map((p) => [p.kode, p.id]));
    }

    const uniqueKodes = [...new Set(items.map((i) => i.kode?.trim()).filter((k): k is string => !!k))];
    const prodiIds = Array.from(prodiKodeToId.values());
    let existingKeySet = new Set<string>();
    if (uniqueKodes.length > 0 && prodiIds.length > 0) {
      const existingMks = await db
        .select({ programStudiId: mataKuliah.programStudiId, kode: mataKuliah.kode })
        .from(mataKuliah)
        .where(and(inArray(mataKuliah.programStudiId, prodiIds), inArray(mataKuliah.kode, uniqueKodes)));
      existingKeySet = new Set(existingMks.map((mk) => `${mk.programStudiId}:${mk.kode}`));
    }

    const validItems: CreateMataKuliahDto[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const urutan = i + 1;
      const kode = item.kode?.trim();
      const nama = item.nama?.trim();

      let resolvedProdiId: number | undefined;
      const trimmedProdiKode = item.kodeProdi?.trim();
      if (trimmedProdiKode) {
        const found = prodiKodeToId.get(trimmedProdiKode);
        if (!found) {
          result.failed++;
          result.errors.push({
            row: urutan,
            kode: kode || '',
            error: `Program Studi dengan kode '${trimmedProdiKode}' tidak ditemukan`,
          });
          continue;
        }
        resolvedProdiId = found;
      } else {
        result.failed++;
        result.errors.push({ row: urutan, kode: kode || '', error: 'kode_prodi wajib diisi' });
        continue;
      }

      if (!kode || !nama) {
        result.failed++;
        result.errors.push({ row: urutan, kode: kode || '', error: 'Kode dan nama wajib diisi' });
        continue;
      }

      if (!item.sksTotal || item.sksTotal <= 0) {
        result.failed++;
        result.errors.push({ row: urutan, kode, error: 'sksTotal wajib diisi dan lebih dari 0' });
        continue;
      }

      if (existingKeySet.has(`${resolvedProdiId}:${kode}`)) {
        result.failed++;
        result.errors.push({ row: urutan, kode, error: 'Kode sudah ada untuk program studi ini' });
        continue;
      }

      validItems.push({
        programStudiId: resolvedProdiId,
        kode,
        nama,
        sksTotal: item.sksTotal,
        sksTatapMuka: item.sksTatapMuka,
        sksPraktek: item.sksPraktek,
        idPddikti: item.idPddikti?.trim() || undefined,
      });
    }

    for (const item of validItems) {
      try {
        await db.insert(mataKuliah).values(item);
        result.success++;
      } catch (err: unknown) {
        result.failed++;
        const msg = err instanceof Error ? err.message : 'Gagal menyimpan data ke database';
        result.errors.push({ row: 0, kode: item.kode, error: msg });
      }
    }

    return result;
  }

  static getTemplateCsv(): string {
    return 'kode_prodi,kode,nama,sks_total,sks_tatap_muka,sks_praktek,id_pddikti\nTI,TI001,Pemrograman Web,3,2,1,\nTI,TI002,Basis Data,3,2,1,';
  }
}

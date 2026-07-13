import { and, count, eq, ilike, inArray, or } from 'drizzle-orm';
import { kurikulum, kurikulumMataKuliah, mataKuliah } from '../models/schema';
import { db } from '../utils/db';

export interface CreateMataKuliahDto {
  kode: string;
  nama: string;
  sksTotal: number;
  sksTatapMuka?: number;
  sksPraktek?: number;
  idPddikti?: string;
}

export class MataKuliahService {
  static async getAll(
    page = 1,
    limit = 10,
    search = '',
    kurikulumId?: number,
    semester?: number,
    sortBy = 'nama',
    sortOrder: 'asc' | 'desc' = 'asc',
  ) {
    const offset = (page - 1) * limit;
    let conditions = [];

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

    let whereClause = undefined;
    if (conditions.length > 0) {
      whereClause = and(...conditions);
    }

    // Fast path: no kurikulum enrichment needed — use database-level pagination
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
      });

      const totalPages = Math.ceil(total / limit);
      return {
        data: data.map((mk: any) => ({ ...mk, semester: null, kurikulum: null, programStudi: null })),
        meta: { total, page, limit, totalPages },
      };
    }

    // Slow path: with kurikulum enrichment — fetch all, enrich, filter, sort, paginate in-memory
    let allData = await db.query.mataKuliah.findMany({ where: whereClause });

    let kurikulumProdiInfo: { id: number; kode: string; nama: string; jenjang: string } | null = null;
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
          jenjang: kur.programStudi.jenjang,
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

      allData = allData.map((mk: any) => {
        const info = kmkMap.get(mk.id);
        return {
          ...mk,
          semester: info?.semester ?? null,
          kurikulum: info ? { kode: info.kode, nama: info.nama } : null,
          programStudi: kurikulumProdiInfo,
        };
      });
    } else {
      allData = allData.map((mk: any) => ({
        ...mk,
        semester: null,
        kurikulum: null,
        programStudi: null,
      }));
    }

    if (semester !== undefined) {
      allData = allData.filter((mk: any) => mk.semester === semester);
    }

    const orderDir = sortOrder === 'desc' ? -1 : 1;
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
        case 'programStudi':
          cmp = (a.programStudi?.nama || '').localeCompare(b.programStudi?.nama || '');
          break;
        case 'kurikulum':
          cmp = (a.kurikulum?.kode || '').localeCompare(b.kurikulum?.kode || '');
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
    const data = await db.query.mataKuliah.findFirst({ where: eq(mataKuliah.id, id) });
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
}

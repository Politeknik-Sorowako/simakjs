import { and, asc, count, desc, eq, ilike, or, type SQL } from 'drizzle-orm';
import { programStudi } from '../models/schema';
import { db } from '../utils/db';

type ProdiWriteData = Partial<{
  kode: string;
  nama: string;
  jenjang: string;
  status: 'aktif' | 'tidak_aktif' | 'persiapan';
  idPddikti: string | null;
  kodeProdiPddikti: string | null;
  nomorSkIzinOperasional: string | null;
  tanggalSkIzinOperasional: string | null;
  tanggalSkIzinOperasionalBerlakuMulai: string | null;
  fileSkIzinOperasional: string | null;
  nilaiAkreditasi: string | null;
  tanggalSkAkreditasi: string | null;
  tanggalSkAkreditasiBerlakuMulai: string | null;
  fileSkAkreditasi: string | null;
}>;

export class ProdiService {
  static async getAll(
    page = 1,
    limit = 10,
    search = '',
    sortBy = 'kode',
    sortOrder: 'asc' | 'desc' = 'asc',
    filterStatus?: string,
  ) {
    const offset = (page - 1) * limit;
    const conditions: SQL<unknown>[] = [];

    if (search) {
      const searchCond = or(ilike(programStudi.nama, `%${search}%`), ilike(programStudi.kode, `%${search}%`));
      if (searchCond) conditions.push(searchCond);
    }
    if (filterStatus && filterStatus.trim()) {
      conditions.push(eq(programStudi.status, filterStatus.trim()));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db.select({ total: count() }).from(programStudi).where(whereClause);

    const total = totalResult?.total || 0;
    const sortColumnMap = {
      kode: programStudi.kode,
      nama: programStudi.nama,
      jenjang: programStudi.jenjang,
      status: programStudi.status,
    } as const;
    const sortColumn = sortColumnMap[sortBy as keyof typeof sortColumnMap] ?? programStudi.kode;
    const data = await db
      .select()
      .from(programStudi)
      .where(whereClause)
      .orderBy(sortOrder === 'desc' ? desc(sortColumn) : asc(sortColumn))
      .limit(limit)
      .offset(offset);

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
    const [prodi] = await db.select().from(programStudi).where(eq(programStudi.id, id));
    return prodi || null;
  }

  static async create(data: ProdiWriteData & { kode: string; nama: string; jenjang: string }) {
    const [newProdi] = await db.insert(programStudi).values(data).returning();
    return newProdi;
  }

  static async update(id: number, data: ProdiWriteData) {
    const [updatedProdi] = await db.update(programStudi).set(data).where(eq(programStudi.id, id)).returning();
    return updatedProdi || null;
  }

  static async delete(id: number) {
    const [deletedProdi] = await db.delete(programStudi).where(eq(programStudi.id, id)).returning();
    return deletedProdi || null;
  }
}

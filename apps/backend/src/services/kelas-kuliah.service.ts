import { db } from '../utils/db';
import { kelasKuliah, mataKuliah } from '../models/schema';
import { count, eq, ilike, or, and, inArray } from 'drizzle-orm';

export interface CreateKelasDto {
  mataKuliahId: number;
  periodeId: string;
  namaKelas: string;
  idPddikti?: string;
}

export class KelasKuliahService {
  static async getAll(page = 1, limit = 10, search = '', programStudiId?: number, periodeId?: string) {
    const offset = (page - 1) * limit;
    let conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(kelasKuliah.namaKelas, `%${search}%`),
          ilike(kelasKuliah.periodeId, `%${search}%`)
        )
      );
    }
    if (periodeId) {
      conditions.push(eq(kelasKuliah.periodeId, periodeId));
    }
    if (programStudiId !== undefined) {
      const courses = await db.select({ id: mataKuliah.id }).from(mataKuliah).where(eq(mataKuliah.programStudiId, programStudiId));
      const courseIds = courses.map(c => c.id);
      if (courseIds.length === 0) {
        return {
          data: [],
          meta: { total: 0, page, limit, totalPages: 0 }
        };
      }
      conditions.push(inArray(kelasKuliah.mataKuliahId, courseIds));
    }

    let whereClause = undefined;
    if (conditions.length > 0) {
      whereClause = and(...conditions);
    }

    const [totalResult] = await db
      .select({ total: count() })
      .from(kelasKuliah)
      .where(whereClause);
    
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
            dosen: true
          }
        }
      }
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages
      }
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
            dosen: true
          }
        }
      }
    });
    return data || null;
  }

  static async create(data: CreateKelasDto) {
    const [newKelas] = await db.insert(kelasKuliah).values(data).returning();
    return newKelas;
  }

  static async update(id: number, data: Partial<CreateKelasDto>) {
    const [updatedKelas] = await db
      .update(kelasKuliah)
      .set(data)
      .where(eq(kelasKuliah.id, id))
      .returning();
    return updatedKelas || null;
  }

  static async delete(id: number) {
    const [deletedKelas] = await db
      .delete(kelasKuliah)
      .where(eq(kelasKuliah.id, id))
      .returning();
    return deletedKelas || null;
  }
}

import { count, eq, ilike, or } from 'drizzle-orm';
import { programStudi } from '../models/schema';
import { db } from '../utils/db';

export class ProdiService {
  static async getAll(page = 1, limit = 10, search = '') {
    const offset = (page - 1) * limit;
    let whereClause = undefined;

    if (search) {
      whereClause = or(ilike(programStudi.nama, `%${search}%`), ilike(programStudi.kode, `%${search}%`));
    }

    const [totalResult] = await db.select({ total: count() }).from(programStudi).where(whereClause);

    const total = totalResult?.total || 0;
    const data = await db.select().from(programStudi).where(whereClause).limit(limit).offset(offset);

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

  static async create(data: { kode: string; nama: string; jenjang: string; idPddikti?: string }) {
    const [newProdi] = await db.insert(programStudi).values(data).returning();
    return newProdi;
  }

  static async update(id: number, data: Partial<{ kode: string; nama: string; jenjang: string; idPddikti: string }>) {
    const [updatedProdi] = await db.update(programStudi).set(data).where(eq(programStudi.id, id)).returning();
    return updatedProdi || null;
  }

  static async delete(id: number) {
    const [deletedProdi] = await db.delete(programStudi).where(eq(programStudi.id, id)).returning();
    return deletedProdi || null;
  }
}

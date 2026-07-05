import { and, count, eq, ilike, or } from 'drizzle-orm';
import { mataKuliah } from '../models/schema';
import { db } from '../utils/db';

export interface CreateMataKuliahDto {
  kode: string;
  nama: string;
  sksTotal: number;
  sksTatapMuka?: number;
  sksPraktek?: number;
  programStudiId?: number;
  idPddikti?: string;
}

export class MataKuliahService {
  static async getAll(page = 1, limit = 10, search = '', programStudiId?: number) {
    const offset = (page - 1) * limit;
    let conditions = [];

    if (search) {
      conditions.push(or(ilike(mataKuliah.nama, `%${search}%`), ilike(mataKuliah.kode, `%${search}%`)));
    }
    if (programStudiId !== undefined) {
      conditions.push(eq(mataKuliah.programStudiId, programStudiId));
    }

    let whereClause = undefined;
    if (conditions.length > 0) {
      whereClause = and(...conditions);
    }

    const [totalResult] = await db.select({ total: count() }).from(mataKuliah).where(whereClause);

    const total = totalResult?.total || 0;

    const data = await db.query.mataKuliah.findMany({
      where: whereClause,
      limit,
      offset,
      with: {
        programStudi: true,
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
    const data = await db.query.mataKuliah.findFirst({
      where: eq(mataKuliah.id, id),
      with: {
        programStudi: true,
      },
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
}

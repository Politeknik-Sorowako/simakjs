import { db } from '../utils/db';
import { periodeAkademik } from '../models/schema';
import { count, eq, ilike, or } from 'drizzle-orm';

export interface CreatePeriodeDto {
  id: string;
  nama: string;
  aktif?: boolean;
  idPddikti?: string;
}

export class PeriodeAkademikService {
  static async getAll(page = 1, limit = 10, search = '') {
    const offset = (page - 1) * limit;
    let whereClause = undefined;

    if (search) {
      whereClause = or(
        ilike(periodeAkademik.nama, `%${search}%`),
        ilike(periodeAkademik.id, `%${search}%`)
      );
    }

    const [totalResult] = await db
      .select({ total: count() })
      .from(periodeAkademik)
      .where(whereClause);
    
    const total = totalResult?.total || 0;
    
    const data = await db
      .select()
      .from(periodeAkademik)
      .where(whereClause)
      .limit(limit)
      .offset(offset);

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

  static async getById(id: string) {
    const [periode] = await db
      .select()
      .from(periodeAkademik)
      .where(eq(periodeAkademik.id, id));
    return periode || null;
  }

  static async create(data: CreatePeriodeDto) {
    const [newPeriode] = await db.insert(periodeAkademik).values(data).returning();
    return newPeriode;
  }

  static async update(id: string, data: Partial<Omit<CreatePeriodeDto, 'id'>>) {
    const [updatedPeriode] = await db
      .update(periodeAkademik)
      .set(data)
      .where(eq(periodeAkademik.id, id))
      .returning();
    return updatedPeriode || null;
  }

  static async delete(id: string) {
    const [deletedPeriode] = await db
      .delete(periodeAkademik)
      .where(eq(periodeAkademik.id, id))
      .returning();
    return deletedPeriode || null;
  }
}

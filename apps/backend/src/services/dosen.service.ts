import { and, count, eq, ilike, or } from 'drizzle-orm';
import { dosen } from '../models/schema';
import { db } from '../utils/db';

export interface CreateDosenDto {
  nip: string;
  nama: string;
  email: string;
  programStudiId?: number;
  idPddikti?: string;
  nidn?: string;
  nik?: string;
  jenisKelamin?: 'L' | 'P';
  tanggalLahir?: string;
}

export class DosenService {
  static async getAll(page = 1, limit = 10, search = '', programStudiId?: number) {
    const offset = (page - 1) * limit;
    let conditions = [];

    if (search) {
      conditions.push(
        or(ilike(dosen.nama, `%${search}%`), ilike(dosen.nip, `%${search}%`), ilike(dosen.email, `%${search}%`)),
      );
    }
    if (programStudiId !== undefined) {
      conditions.push(eq(dosen.programStudiId, programStudiId));
    }

    let whereClause = undefined;
    if (conditions.length > 0) {
      whereClause = and(...conditions);
    }

    const [totalResult] = await db.select({ total: count() }).from(dosen).where(whereClause);

    const total = totalResult?.total || 0;

    const data = await db.query.dosen.findMany({
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
    const data = await db.query.dosen.findFirst({
      where: eq(dosen.id, id),
      with: {
        programStudi: true,
      },
    });
    return data || null;
  }

  static async create(data: CreateDosenDto) {
    const [newDosen] = await db.insert(dosen).values(data).returning();
    return newDosen;
  }

  static async update(id: number, data: Partial<CreateDosenDto>) {
    const [updatedDosen] = await db.update(dosen).set(data).where(eq(dosen.id, id)).returning();
    return updatedDosen || null;
  }

  static async delete(id: number) {
    const [deletedDosen] = await db.delete(dosen).where(eq(dosen.id, id)).returning();
    return deletedDosen || null;
  }
}

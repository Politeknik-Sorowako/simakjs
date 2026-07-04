import { db } from '../utils/db';
import { mahasiswa } from '../models/schema';
import { count, eq, ilike, or, and } from 'drizzle-orm';

export interface CreateMahasiswaDto {
  nim: string;
  nama: string;
  email: string;
  programStudiId: number;
  dosenPaId?: number | null;
  status?: string;
  idPddikti?: string;
  namaIbuKandung: string;
  nik: string;
  jenisKelamin: 'L' | 'P';
  tanggalLahir: string;
}

export class MahasiswaService {
  static async getAll(page = 1, limit = 10, search = '', dosenPaId?: number, programStudiId?: number) {
    const offset = (page - 1) * limit;
    
    let conditions = [];
    if (search) {
      conditions.push(
        or(
          ilike(mahasiswa.nama, `%${search}%`),
          ilike(mahasiswa.nim, `%${search}%`),
          ilike(mahasiswa.email, `%${search}%`)
        )
      );
    }
    if (dosenPaId !== undefined) {
      conditions.push(eq(mahasiswa.dosenPaId, dosenPaId));
    }
    if (programStudiId !== undefined) {
      conditions.push(eq(mahasiswa.programStudiId, programStudiId));
    }

    let whereClause = undefined;
    if (conditions.length > 0) {
      whereClause = and(...conditions);
    }

    const [totalResult] = await db
      .select({ total: count() })
      .from(mahasiswa)
      .where(whereClause);
    
    const total = totalResult?.total || 0;
    
    const data = await db.query.mahasiswa.findMany({
      where: whereClause,
      limit,
      offset,
      with: {
        programStudi: true,
        dosenPa: true
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
    const data = await db.query.mahasiswa.findFirst({
      where: eq(mahasiswa.id, id),
      with: {
        programStudi: true,
        dosenPa: true
      }
    });
    return data || null;
  }

  static async create(data: CreateMahasiswaDto) {
    const [newMhs] = await db.insert(mahasiswa).values(data).returning();
    return newMhs;
  }

  static async update(id: number, data: Partial<CreateMahasiswaDto>) {
    const [updatedMhs] = await db
      .update(mahasiswa)
      .set(data)
      .where(eq(mahasiswa.id, id))
      .returning();
    return updatedMhs || null;
  }

  static async delete(id: number) {
    const [deletedMhs] = await db
      .delete(mahasiswa)
      .where(eq(mahasiswa.id, id))
      .returning();
    return deletedMhs || null;
  }
}

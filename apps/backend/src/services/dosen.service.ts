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
  tempatLahir?: string;
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
    const sanitized = {
      ...data,
      nik: data.nik?.trim() ? data.nik : null,
      tanggalLahir: data.tanggalLahir?.trim() ? data.tanggalLahir : null,
      tempatLahir: data.tempatLahir?.trim() ? data.tempatLahir : null,
      nidn: data.nidn?.trim() ? data.nidn : null,
      idPddikti: data.idPddikti?.trim() ? data.idPddikti : null,
    };
    const [newDosen] = await db.insert(dosen).values(sanitized).returning();
    return newDosen;
  }

  static async update(id: number, data: Partial<CreateDosenDto>) {
    const sanitized: Record<string, unknown> = { ...data };
    if ('nik' in data) sanitized.nik = data.nik?.trim() ? data.nik : null;
    if ('tanggalLahir' in data) sanitized.tanggalLahir = data.tanggalLahir?.trim() ? data.tanggalLahir : null;
    if ('tempatLahir' in data) sanitized.tempatLahir = data.tempatLahir?.trim() ? data.tempatLahir : null;
    if ('nidn' in data) sanitized.nidn = data.nidn?.trim() ? data.nidn : null;
    if ('idPddikti' in data) sanitized.idPddikti = data.idPddikti?.trim() ? data.idPddikti : null;

    const [updatedDosen] = await db.update(dosen).set(sanitized).where(eq(dosen.id, id)).returning();
    return updatedDosen || null;
  }

  static async delete(id: number) {
    const [deletedDosen] = await db.delete(dosen).where(eq(dosen.id, id)).returning();
    return deletedDosen || null;
  }
}

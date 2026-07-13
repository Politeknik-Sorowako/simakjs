import { eq } from 'drizzle-orm';
import { bahanKajian } from '../models/schema';
import { db } from '../utils/db';

export interface CreateBahanKajianDto {
  programStudiId: number;
  kode: string;
  nama: string;
  deskripsi?: string;
  urutan?: number;
}

export class BahanKajianService {
  static async getAll(prodiId?: number) {
    if (prodiId) {
      return db.query.bahanKajian.findMany({
        where: eq(bahanKajian.programStudiId, prodiId),
        with: { programStudi: true },
        orderBy: (bk, { asc }) => [asc(bk.urutan)],
      });
    }
    return db.query.bahanKajian.findMany({
      with: { programStudi: true },
      orderBy: (bk, { asc }) => [asc(bk.urutan)],
    });
  }

  static async getById(id: number) {
    return db.query.bahanKajian.findFirst({
      where: eq(bahanKajian.id, id),
      with: {
        programStudi: true,
        cplMappings: {
          with: { cpl: true },
        },
        mataKuliahMappings: {
          with: { mataKuliah: true },
        },
      },
    });
  }

  static async create(data: CreateBahanKajianDto) {
    const [newData] = await db.insert(bahanKajian).values(data).returning();
    return newData;
  }

  static async update(id: number, data: Partial<CreateBahanKajianDto>) {
    const [updated] = await db.update(bahanKajian).set(data).where(eq(bahanKajian.id, id)).returning();
    return updated || null;
  }

  static async delete(id: number) {
    const [deleted] = await db.delete(bahanKajian).where(eq(bahanKajian.id, id)).returning();
    return deleted || null;
  }
}

import { and, eq } from 'drizzle-orm';
import { bahanKajian } from '../models/schema';
import { db } from '../utils/db';

export interface CreateBahanKajianDto {
  programStudiId: number;
  kode: string;
  nama: string;
  deskripsi?: string;
  urutan?: number;
}

export interface ImportBahanKajianItem {
  kode: string;
  nama: string;
  deskripsi?: string;
}

export interface ImportResult {
  success: number;
  failed: number;
  errors: { row: number; kode: string; error: string }[];
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

  static async import(programStudiId: number, items: ImportBahanKajianItem[]): Promise<ImportResult> {
    const result: ImportResult = { success: 0, failed: 0, errors: [] };

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const urutan = i + 1;

      try {
        const existing = await db.query.bahanKajian.findFirst({
          where: and(eq(bahanKajian.programStudiId, programStudiId), eq(bahanKajian.kode, item.kode)),
        });

        if (existing) {
          result.failed++;
          result.errors.push({ row: urutan, kode: item.kode, error: 'Kode sudah ada' });
          continue;
        }

        await db.insert(bahanKajian).values({
          programStudiId,
          kode: item.kode,
          nama: item.nama,
          deskripsi: item.deskripsi || undefined,
          urutan,
        });
        result.success++;
      } catch (err: any) {
        result.failed++;
        result.errors.push({ row: urutan, kode: item.kode, error: err.message || 'Error tidak diketahui' });
      }
    }

    return result;
  }

  static getTemplateCsv(): string {
    return 'kode,nama,deskripsi\nBK-01,Pemrograman Dasar,Konsep dasar pemrograman dan algoritma\nBK-02,Basis Data,Perancangan dan implementasi basis data\nBK-03,Jaringan Komputer,Fundamental jaringan dan protokol komunikasi';
  }
}

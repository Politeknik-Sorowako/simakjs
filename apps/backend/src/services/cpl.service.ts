import { and, eq } from 'drizzle-orm';
import { cpl } from '../models/schema';
import { db } from '../utils/db';

export interface CreateCplDto {
  programStudiId: number;
  kode: string;
  deskripsi: string;
  urutan?: number;
}

export interface ImportCplItem {
  kode: string;
  deskripsi: string;
}

export interface ImportCplResult {
  success: number;
  failed: number;
  errors: { row: number; kode: string; error: string }[];
}

export class CplService {
  static async getAll(prodiId?: number) {
    if (prodiId) {
      return db.query.cpl.findMany({
        where: eq(cpl.programStudiId, prodiId),
        with: { programStudi: true },
      });
    }
    return db.query.cpl.findMany({
      with: { programStudi: true },
    });
  }

  static async getById(id: number) {
    return db.query.cpl.findFirst({
      where: eq(cpl.id, id),
      with: {
        programStudi: true,
        profilLulusanMappings: {
          with: { profilLulusan: true },
        },
        cpmkMappings: {
          with: {
            cpmk: {
              with: { mataKuliah: true },
            },
          },
        },
      },
    });
  }

  static async create(data: CreateCplDto) {
    const [newData] = await db.insert(cpl).values(data).returning();
    return newData;
  }

  static async update(id: number, data: Partial<CreateCplDto>) {
    const [updated] = await db.update(cpl).set(data).where(eq(cpl.id, id)).returning();
    return updated || null;
  }

  static async delete(id: number) {
    const [deleted] = await db.delete(cpl).where(eq(cpl.id, id)).returning();
    return deleted || null;
  }

  static async import(programStudiId: number, items: ImportCplItem[]): Promise<ImportCplResult> {
    const result: ImportCplResult = { success: 0, failed: 0, errors: [] };

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const urutan = i + 1;

      try {
        const existing = await db.query.cpl.findFirst({
          where: and(eq(cpl.programStudiId, programStudiId), eq(cpl.kode, item.kode)),
        });

        if (existing) {
          result.failed++;
          result.errors.push({ row: urutan, kode: item.kode, error: 'Kode sudah ada' });
          continue;
        }

        await db.insert(cpl).values({
          programStudiId,
          kode: item.kode,
          deskripsi: item.deskripsi,
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
    return 'kode,deskripsi\nCPL-01,Mampu menerapkan konsep dasar pemrograman\nCPL-02,Mampu menganalisis kebutuhan sistem\nCPL-03,Mampu merancang solusi teknologi informasi';
  }
}

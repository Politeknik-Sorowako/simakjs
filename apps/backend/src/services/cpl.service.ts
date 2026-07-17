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
        orderBy: (c, { asc }) => [asc(c.urutan)],
      });
    }
    return db.query.cpl.findMany({
      with: { programStudi: true },
      orderBy: (c, { asc }) => [asc(c.urutan)],
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
    const validItems: { kode: string; deskripsi: string; urutan: number }[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const urutan = i + 1;
      const kode = item.kode?.trim();
      const deskripsi = item.deskripsi?.trim();

      if (!kode || !deskripsi) {
        result.failed++;
        result.errors.push({ row: urutan, kode: kode || '', error: 'Kode dan deskripsi wajib diisi' });
        continue;
      }

      if (kode.length > 20) {
        result.failed++;
        result.errors.push({ row: urutan, kode, error: 'Kode maksimal 20 karakter' });
        continue;
      }

      const existing = await db.query.cpl.findFirst({
        where: and(eq(cpl.programStudiId, programStudiId), eq(cpl.kode, kode)),
      });

      if (existing) {
        result.failed++;
        result.errors.push({ row: urutan, kode, error: 'Kode sudah ada' });
        continue;
      }

      validItems.push({ kode, deskripsi, urutan });
    }

    if (validItems.length > 0) {
      try {
        await db.transaction(async (tx) => {
          await tx.insert(cpl).values(
            validItems.map((item) => ({
              programStudiId,
              kode: item.kode,
              deskripsi: item.deskripsi,
              urutan: item.urutan,
            })),
          );
        });
        result.success = validItems.length;
      } catch (err: unknown) {
        result.failed += validItems.length;
        result.errors.push({
          row: 0,
          kode: '',
          error: 'Gagal menyimpan data ke database',
        });
        console.error('CPL import error:', err);
      }
    }

    return result;
  }

  static getTemplateCsv(): string {
    return 'kode,deskripsi\nCPL-01,Mampu menerapkan konsep dasar pemrograman\nCPL-02,Mampu menganalisis kebutuhan sistem\nCPL-03,Mampu merancang solusi teknologi informasi';
  }
}

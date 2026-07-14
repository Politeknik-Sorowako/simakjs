import { and, eq } from 'drizzle-orm';
import { profilLulusan } from '../models/schema';
import { db } from '../utils/db';

export interface CreateProfilLulusanDto {
  programStudiId: number;
  kode: string;
  deskripsi: string;
  urutan?: number;
}

export interface ImportProfilLulusanItem {
  kode: string;
  deskripsi: string;
}

export interface ImportResult {
  success: number;
  failed: number;
  errors: { row: number; kode: string; error: string }[];
}

export class ProfilLulusanService {
  static async getAll(prodiId?: number) {
    if (prodiId) {
      return db.query.profilLulusan.findMany({
        where: eq(profilLulusan.programStudiId, prodiId),
        with: { programStudi: true },
      });
    }
    return db.query.profilLulusan.findMany({
      with: { programStudi: true },
    });
  }

  static async getById(id: number) {
    return db.query.profilLulusan.findFirst({
      where: eq(profilLulusan.id, id),
      with: {
        programStudi: true,
        cplMappings: {
          with: { cpl: true },
        },
      },
    });
  }

  static async create(data: CreateProfilLulusanDto) {
    const [newData] = await db.insert(profilLulusan).values(data).returning();
    return newData;
  }

  static async update(id: number, data: Partial<CreateProfilLulusanDto>) {
    const [updated] = await db.update(profilLulusan).set(data).where(eq(profilLulusan.id, id)).returning();
    return updated || null;
  }

  static async delete(id: number) {
    const [deleted] = await db.delete(profilLulusan).where(eq(profilLulusan.id, id)).returning();
    return deleted || null;
  }

  static async import(programStudiId: number, items: ImportProfilLulusanItem[]): Promise<ImportResult> {
    const result: ImportResult = { success: 0, failed: 0, errors: [] };

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const urutan = i + 1;

      try {
        const existing = await db.query.profilLulusan.findFirst({
          where: and(eq(profilLulusan.programStudiId, programStudiId), eq(profilLulusan.kode, item.kode)),
        });

        if (existing) {
          result.failed++;
          result.errors.push({ row: urutan, kode: item.kode, error: 'Kode sudah ada' });
          continue;
        }

        await db.insert(profilLulusan).values({
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
    return 'kode,deskripsi\nPL-01,Mampu mengaplikasikan pengetahuan bidang teknologi informasi\nPL-02,Mampu merancang solusi berbasis teknologi informasi\nPL-03,Mampu mengelola proyek teknologi informasi secara profesional';
  }
}

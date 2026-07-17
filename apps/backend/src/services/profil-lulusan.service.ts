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
        orderBy: (pl, { asc }) => [asc(pl.urutan)],
      });
    }
    return db.query.profilLulusan.findMany({
      with: { programStudi: true },
      orderBy: (pl, { asc }) => [asc(pl.urutan)],
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

      const existing = await db.query.profilLulusan.findFirst({
        where: and(eq(profilLulusan.programStudiId, programStudiId), eq(profilLulusan.kode, kode)),
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
          await tx.insert(profilLulusan).values(
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
        console.error('Profil Lulusan import error:', err);
      }
    }

    return result;
  }

  static getTemplateCsv(): string {
    return 'kode,deskripsi\nPL-01,Mampu mengaplikasikan pengetahuan bidang teknologi informasi\nPL-02,Mampu merancang solusi berbasis teknologi informasi\nPL-03,Mampu mengelola proyek teknologi informasi secara profesional';
  }
}

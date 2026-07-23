import { and, eq, inArray } from 'drizzle-orm';
import { cpl, programStudi } from '../models/schema';
import { db } from '../utils/db';

export interface CreateCplDto {
  programStudiId: number;
  kode: string;
  deskripsi: string;
  urutan?: number;
}

export interface ImportCplItem {
  kodeProdi?: string;
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

  static async import(programStudiId: number | undefined, items: ImportCplItem[]): Promise<ImportCplResult> {
    const result: ImportCplResult = { success: 0, failed: 0, errors: [] };

    const uniqueKodes = [...new Set(items.map((item) => item.kodeProdi).filter((k): k is string => !!k))];
    let kodeToId = new Map<string, number>();
    if (uniqueKodes.length > 0) {
      const prodis = await db
        .select({ id: programStudi.id, kode: programStudi.kode })
        .from(programStudi)
        .where(inArray(programStudi.kode, uniqueKodes));
      kodeToId = new Map(prodis.map((p) => [p.kode, p.id]));
    }

    if (programStudiId && !kodeToId.has(programStudiId.toString())) {
      kodeToId.set(programStudiId.toString(), programStudiId);
    }

    const uniqueCplKodes = [...new Set(items.map((i) => i.kode?.trim()).filter((k): k is string => !!k))];
    const prodiIds = Array.from(kodeToId.values());
    let existingKeySet = new Set<string>();
    if (uniqueCplKodes.length > 0 && prodiIds.length > 0) {
      const existingCpls = await db
        .select({ programStudiId: cpl.programStudiId, kode: cpl.kode })
        .from(cpl)
        .where(and(inArray(cpl.programStudiId, prodiIds), inArray(cpl.kode, uniqueCplKodes)));
      existingKeySet = new Set(existingCpls.map((c) => `${c.programStudiId}:${c.kode}`));
    }

    const validItems: { kode: string; deskripsi: string; urutan: number; resolvedProdiId: number }[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const urutan = i + 1;
      const kode = item.kode?.trim();
      const deskripsi = item.deskripsi?.trim();

      let resolvedProdiId: number | undefined;
      if (item.kodeProdi) {
        const found = kodeToId.get(item.kodeProdi);
        if (!found) {
          result.failed++;
          result.errors.push({
            row: urutan,
            kode: kode || '',
            error: `Program studi dengan kode '${item.kodeProdi}' tidak ditemukan`,
          });
          continue;
        }
        resolvedProdiId = found;
      } else if (programStudiId) {
        resolvedProdiId = programStudiId;
      } else {
        result.failed++;
        result.errors.push({ row: urutan, kode: kode || '', error: 'kode_prodi wajib diisi' });
        continue;
      }

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

      if (existingKeySet.has(`${resolvedProdiId}:${kode}`)) {
        result.failed++;
        result.errors.push({ row: urutan, kode, error: 'Kode sudah ada' });
        continue;
      }

      validItems.push({ kode, deskripsi, urutan, resolvedProdiId });
    }

    for (const item of validItems) {
      try {
        await db.insert(cpl).values({
          programStudiId: item.resolvedProdiId,
          kode: item.kode,
          deskripsi: item.deskripsi,
          urutan: item.urutan,
        });
        result.success++;
      } catch (err: unknown) {
        result.failed++;
        const msg = err instanceof Error ? err.message : 'Gagal menyimpan data ke database';
        result.errors.push({ row: 0, kode: item.kode, error: msg });
      }
    }

    return result;
  }

  static getTemplateCsv(): string {
    return 'kode_prodi,kode,deskripsi\nTI,CPL-01,Mampu menerapkan konsep dasar pemrograman\nTI,CPL-02,Mampu menganalisis kebutuhan sistem\nTK,CPL-03,Mampu merancang solusi teknologi informasi';
  }
}

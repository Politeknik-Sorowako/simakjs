import { and, eq, inArray } from 'drizzle-orm';
import { bahanKajian, programStudi } from '../models/schema';
import { db } from '../utils/db';

export interface CreateBahanKajianDto {
  programStudiId: number;
  kode: string;
  nama: string;
  deskripsi?: string;
  urutan?: number;
}

export interface ImportBahanKajianItem {
  kodeProdi?: string;
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

  static async import(programStudiId: number | undefined, items: ImportBahanKajianItem[]): Promise<ImportResult> {
    const result: ImportResult = { success: 0, failed: 0, errors: [] };

    const uniqueKodes = [...new Set(items.map((item) => item.kodeProdi).filter((k): k is string => !!k))];
    let kodeToId = new Map<string, number>();
    if (uniqueKodes.length > 0) {
      const prodis = await db
        .select({ id: programStudi.id, kode: programStudi.kode })
        .from(programStudi)
        .where(inArray(programStudi.kode, uniqueKodes));
      kodeToId = new Map(prodis.map((p) => [p.kode, p.id]));
    }

    const validItems: { kode: string; nama: string; deskripsi?: string; urutan: number; resolvedProdiId: number }[] =
      [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const urutan = i + 1;
      const kode = item.kode?.trim();
      const nama = item.nama?.trim();
      const deskripsi = item.deskripsi?.trim() || undefined;

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

      if (!kode || !nama) {
        result.failed++;
        result.errors.push({ row: urutan, kode: kode || '', error: 'Kode dan nama wajib diisi' });
        continue;
      }

      if (kode.length > 20) {
        result.failed++;
        result.errors.push({ row: urutan, kode, error: 'Kode maksimal 20 karakter' });
        continue;
      }

      const existing = await db.query.bahanKajian.findFirst({
        where: and(eq(bahanKajian.programStudiId, resolvedProdiId), eq(bahanKajian.kode, kode)),
      });

      if (existing) {
        result.failed++;
        result.errors.push({ row: urutan, kode, error: 'Kode sudah ada' });
        continue;
      }

      validItems.push({ kode, nama, deskripsi, urutan, resolvedProdiId });
    }

    if (validItems.length > 0) {
      try {
        await db.transaction(async (tx) => {
          await tx.insert(bahanKajian).values(
            validItems.map((item) => ({
              programStudiId: item.resolvedProdiId,
              kode: item.kode,
              nama: item.nama,
              deskripsi: item.deskripsi || undefined,
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
        console.error('Bahan Kajian import error:', err);
      }
    }

    return result;
  }

  static getTemplateCsv(): string {
    return 'kode_prodi,kode,nama,deskripsi\nTI,BK-01,Pemrograman Dasar,Konsep dasar pemrograman dan algoritma\nTI,BK-02,Basis Data,Perancangan dan implementasi basis data\nTK,BK-03,Jaringan Komputer,Fundamental jaringan dan protokol komunikasi';
  }
}

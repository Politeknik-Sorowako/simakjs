import { and, eq, inArray } from 'drizzle-orm';
import { programStudi, visiMisiProdi } from '../models/schema';
import { db } from '../utils/db';

export interface CreateVisiMisiDto {
  programStudiId: number;
  visi: string;
  misi: string;
  tujuan?: string;
  sasaran?: string;
  tahunBerlaku?: string;
  isAktif?: boolean;
}

export interface ImportVisiMisiItem {
  kodeProdi?: string;
  tahunBerlaku: string;
  visi: string;
  misi: string;
  tujuan?: string;
  sasaran?: string;
}

export interface ImportResult {
  success: number;
  failed: number;
  errors: { row: number; tahunBerlaku: string; error: string }[];
}

export class VisiMisiService {
  static async getAll(prodiId?: number) {
    if (prodiId) {
      return db.query.visiMisiProdi.findMany({
        where: eq(visiMisiProdi.programStudiId, prodiId),
        with: { programStudi: true },
        orderBy: (vm, { desc }) => [desc(vm.tahunBerlaku)],
      });
    }
    return db.query.visiMisiProdi.findMany({
      with: { programStudi: true },
      orderBy: (vm, { desc }) => [desc(vm.tahunBerlaku)],
    });
  }

  static async getAktif(prodiId: number) {
    return db.query.visiMisiProdi.findFirst({
      where: and(eq(visiMisiProdi.programStudiId, prodiId), eq(visiMisiProdi.isAktif, true)),
      with: { programStudi: true },
    });
  }

  static async getById(id: number) {
    return db.query.visiMisiProdi.findFirst({
      where: eq(visiMisiProdi.id, id),
      with: { programStudi: true },
    });
  }

  static async create(data: CreateVisiMisiDto) {
    const [newData] = await db.insert(visiMisiProdi).values(data).returning();
    return newData;
  }

  static async update(id: number, data: Partial<CreateVisiMisiDto>) {
    const [updated] = await db.update(visiMisiProdi).set(data).where(eq(visiMisiProdi.id, id)).returning();
    return updated || null;
  }

  static async delete(id: number) {
    const [deleted] = await db.delete(visiMisiProdi).where(eq(visiMisiProdi.id, id)).returning();
    return deleted || null;
  }

  static async setAktif(id: number) {
    const record = await db.query.visiMisiProdi.findFirst({
      where: eq(visiMisiProdi.id, id),
    });
    if (!record) return null;

    return await db.transaction(async (tx) => {
      await tx
        .update(visiMisiProdi)
        .set({ isAktif: false })
        .where(and(eq(visiMisiProdi.programStudiId, record.programStudiId), eq(visiMisiProdi.isAktif, true)));

      const [updated] = await tx
        .update(visiMisiProdi)
        .set({ isAktif: true })
        .where(eq(visiMisiProdi.id, id))
        .returning();

      return updated;
    });
  }

  static async import(programStudiId: number | undefined, items: ImportVisiMisiItem[]): Promise<ImportResult> {
    const result: ImportResult = { success: 0, failed: 0, errors: [] };

    // Resolve kodeProdi → programStudiId
    const uniqueKodes = [...new Set(items.map((item) => item.kodeProdi).filter((k): k is string => !!k))];
    let kodeToId = new Map<string, number>();
    if (uniqueKodes.length > 0) {
      const prodis = await db
        .select({ id: programStudi.id, kode: programStudi.kode })
        .from(programStudi)
        .where(inArray(programStudi.kode, uniqueKodes));
      kodeToId = new Map(prodis.map((p) => [p.kode, p.id]));
    }

    const validItems: { item: ImportVisiMisiItem; resolvedProdiId: number }[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const visi = item.visi?.trim();
      const misi = item.misi?.trim();
      const tahunBerlaku = item.tahunBerlaku?.trim();

      if (!visi || !misi) {
        result.failed++;
        result.errors.push({ row: i + 1, tahunBerlaku: tahunBerlaku || '', error: 'Visi dan Misi wajib diisi' });
        continue;
      }

      // Resolve program studi
      let resolvedProdiId: number | undefined;
      if (item.kodeProdi) {
        const found = kodeToId.get(item.kodeProdi);
        if (!found) {
          result.failed++;
          result.errors.push({
            row: i + 1,
            tahunBerlaku: tahunBerlaku || '',
            error: `Program studi dengan kode '${item.kodeProdi}' tidak ditemukan`,
          });
          continue;
        }
        resolvedProdiId = found;
      } else if (programStudiId) {
        resolvedProdiId = programStudiId;
      } else {
        result.failed++;
        result.errors.push({
          row: i + 1,
          tahunBerlaku: tahunBerlaku || '',
          error: 'kode_prodi wajib diisi',
        });
        continue;
      }

      if (tahunBerlaku) {
        const existing = await db.query.visiMisiProdi.findFirst({
          where: and(eq(visiMisiProdi.programStudiId, resolvedProdiId), eq(visiMisiProdi.tahunBerlaku, tahunBerlaku)),
        });

        if (existing) {
          result.failed++;
          result.errors.push({
            row: i + 1,
            tahunBerlaku,
            error: 'Tahun berlaku sudah ada untuk program studi ini',
          });
          continue;
        }
      }

      validItems.push({ item: { ...item, visi, misi, tahunBerlaku }, resolvedProdiId });
    }

    if (validItems.length > 0) {
      try {
        await db.transaction(async (tx) => {
          await tx.insert(visiMisiProdi).values(
            validItems.map(({ item, resolvedProdiId }) => ({
              programStudiId: resolvedProdiId,
              visi: item.visi,
              misi: item.misi,
              tujuan: item.tujuan?.trim() || undefined,
              sasaran: item.sasaran?.trim() || undefined,
              tahunBerlaku: item.tahunBerlaku || undefined,
              isAktif: false,
            })),
          );
        });
        result.success = validItems.length;
      } catch (err: unknown) {
        result.failed += validItems.length;
        result.errors.push({
          row: 0,
          tahunBerlaku: '',
          error: 'Gagal menyimpan data ke database',
        });
        console.error('Visi Misi import error:', err);
      }
    }

    return result;
  }

  static getTemplateCsv(): string {
    return 'kode_prodi,tahunBerlaku,visi,misi,tujuan,sasaran\nTI,2024,Menjadi program studi unggul dalam teknologi informasi,Menyelenggarakan pendidikan berkualitas,Menghasilkan lulusan kompeten,Meningkatkan akreditasi';
  }
}

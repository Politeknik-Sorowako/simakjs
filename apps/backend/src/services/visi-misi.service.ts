import { and, eq } from 'drizzle-orm';
import { visiMisiProdi } from '../models/schema';
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

  static async import(programStudiId: number, items: ImportVisiMisiItem[]): Promise<ImportResult> {
    const result: ImportResult = { success: 0, failed: 0, errors: [] };

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      try {
        if (!item.visi || !item.misi) {
          result.failed++;
          result.errors.push({ row: i + 1, tahunBerlaku: item.tahunBerlaku || '', error: 'Visi dan Misi wajib diisi' });
          continue;
        }

        await db.insert(visiMisiProdi).values({
          programStudiId,
          visi: item.visi,
          misi: item.misi,
          tujuan: item.tujuan || undefined,
          sasaran: item.sasaran || undefined,
          tahunBerlaku: item.tahunBerlaku || undefined,
          isAktif: false,
        });
        result.success++;
      } catch (err: any) {
        result.failed++;
        result.errors.push({
          row: i + 1,
          tahunBerlaku: item.tahunBerlaku || '',
          error: err.message || 'Error tidak diketahui',
        });
      }
    }

    return result;
  }

  static getTemplateCsv(): string {
    return 'tahunBerlaku,visi,misi,tujuan,sasaran\n2024,Menjadi program studi unggul dalam teknologi informasi,Menyelenggarakan pendidikan berkualitas,Menghasilkan lulusan kompeten,Meningkatkan akreditasi';
  }
}

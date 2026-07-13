import { eq } from 'drizzle-orm';
import { subCpmk } from '../models/schema';
import { db } from '../utils/db';

export interface CreateSubCpmkDto {
  cpmkId: number;
  kode: string;
  deskripsi: string;
  urutan?: number;
}

export class SubCpmkService {
  static async getByCpmk(cpmkId: number) {
    return db.query.subCpmk.findMany({
      where: eq(subCpmk.cpmkId, cpmkId),
      orderBy: subCpmk.urutan,
    });
  }

  static async getById(id: number) {
    return db.query.subCpmk.findFirst({
      where: eq(subCpmk.id, id),
      with: { cpmk: { with: { mataKuliah: true } } },
    });
  }

  static async create(data: CreateSubCpmkDto) {
    const [newData] = await db.insert(subCpmk).values(data).returning();
    return newData;
  }

  static async update(id: number, data: Partial<CreateSubCpmkDto>) {
    const [updated] = await db.update(subCpmk).set(data).where(eq(subCpmk.id, id)).returning();
    return updated || null;
  }

  static async delete(id: number) {
    const [deleted] = await db.delete(subCpmk).where(eq(subCpmk.id, id)).returning();
    return deleted || null;
  }
}

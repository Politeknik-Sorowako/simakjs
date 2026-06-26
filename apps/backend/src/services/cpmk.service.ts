import { db } from '../utils/db';
import { cpmk } from '../models/schema';
import { eq } from 'drizzle-orm';

export class CpmkService {
  static async getByMataKuliah(mataKuliahId: number) {
    return await db.select().from(cpmk).where(eq(cpmk.mataKuliahId, mataKuliahId));
  }

  static async create(data: { mataKuliahId: number; kode: string; deskripsi: string }) {
    const [newCpmk] = await db.insert(cpmk).values(data).returning();
    return newCpmk;
  }

  static async delete(id: number) {
    const [deleted] = await db.delete(cpmk).where(eq(cpmk.id, id)).returning();
    return deleted || null;
  }
}

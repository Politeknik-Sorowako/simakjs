import { db } from '../utils/db';
import { bap } from '../models/schema';
import { eq } from 'drizzle-orm';

export class BapService {
  static async getByKelas(kelasKuliahId: number) {
    return await db.select().from(bap).where(eq(bap.kelasKuliahId, kelasKuliahId));
  }

  static async create(data: {
    kelasKuliahId: number;
    tanggal: string;
    pertemuanKe: number;
    materi: string;
    durasiMenit: number;
    cpmkId: number;
    dosenId: number;
  }) {
    const [newBap] = await db.insert(bap).values(data).returning();
    return newBap;
  }
}

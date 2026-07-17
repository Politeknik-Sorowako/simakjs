import { and, eq } from 'drizzle-orm';
import { mataKuliahBahanKajian } from '../models/schema';
import { db } from '../utils/db';

export interface AttachBahanKajianDto {
  bahanKajianId: number;
  bobotKontribusi?: number | null;
}

export class MataKuliahBahanKajianService {
  static async getByMataKuliah(mataKuliahId: number) {
    return db.query.mataKuliahBahanKajian.findMany({
      where: eq(mataKuliahBahanKajian.mataKuliahId, mataKuliahId),
      with: {
        bahanKajian: true,
      },
    });
  }

  static async attach(mataKuliahId: number, data: AttachBahanKajianDto) {
    const [newData] = await db
      .insert(mataKuliahBahanKajian)
      .values({
        mataKuliahId,
        ...data,
        bobotKontribusi: data.bobotKontribusi ? data.bobotKontribusi.toString() : null,
      })
      .returning();
    return newData;
  }

  static async detach(mataKuliahId: number, bahanKajianId: number) {
    const [deleted] = await db
      .delete(mataKuliahBahanKajian)
      .where(
        and(
          eq(mataKuliahBahanKajian.mataKuliahId, mataKuliahId),
          eq(mataKuliahBahanKajian.bahanKajianId, bahanKajianId),
        ),
      )
      .returning();
    return deleted || null;
  }
}

import { desc, eq } from 'drizzle-orm';
import { kategoriBimbingan } from '../models/schema';
import { db } from '../utils/db';

export class KategoriBimbinganService {
  static async getAll() {
    const list = await db
      .select()
      .from(kategoriBimbingan)
      .where(eq(kategoriBimbingan.isActive, true))
      .orderBy(desc(kategoriBimbingan.createdAt));
    return list;
  }

  static async create(data: { nama: string; deskripsi?: string }) {
    const [inserted] = await db
      .insert(kategoriBimbingan)
      .values({
        nama: data.nama,
        deskripsi: data.deskripsi || null,
        isActive: true,
      })
      .returning();
    return inserted;
  }

  static async update(id: number, data: { nama?: string; deskripsi?: string; isActive?: boolean }) {
    const [updated] = await db
      .update(kategoriBimbingan)
      .set({
        ...(data.nama !== undefined && { nama: data.nama }),
        ...(data.deskripsi !== undefined && { deskripsi: data.deskripsi }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        updatedAt: new Date(),
      })
      .where(eq(kategoriBimbingan.id, id))
      .returning();
    return updated;
  }

  static async delete(id: number) {
    const [deleted] = await db
      .update(kategoriBimbingan)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(kategoriBimbingan.id, id))
      .returning();
    return deleted;
  }
}

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
}

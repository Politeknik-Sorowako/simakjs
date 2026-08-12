import { and, desc, eq, sql } from 'drizzle-orm';
import { pasalPelanggaran, programStudi } from '../models/schema';
import { db } from '../utils/db';

export class PasalPelanggaranService {
  static async getAll(options?: { search?: string; programStudiId?: number; includeInactive?: boolean }) {
    const conditions = [eq(pasalPelanggaran.isActive, true)];
    if (options?.includeInactive) {
      conditions.length = 0;
    }
    if (options?.programStudiId) {
      conditions.push(
        sql`(${pasalPelanggaran.programStudiId} IS NULL OR ${pasalPelanggaran.programStudiId} = ${options.programStudiId})`,
      );
    }
    if (options?.search) {
      const q = `%${options.search.toLowerCase()}%`;
      conditions.push(
        sql`(LOWER(${pasalPelanggaran.nomorPasal}) LIKE ${q} OR LOWER(${pasalPelanggaran.bunyiPasal}) LIKE ${q})`,
      );
    }

    return await db
      .select({
        id: pasalPelanggaran.id,
        nomorPasal: pasalPelanggaran.nomorPasal,
        bunyiPasal: pasalPelanggaran.bunyiPasal,
        bobotPoin: pasalPelanggaran.bobotPoin,
        jenisSanksi: pasalPelanggaran.jenisSanksi,
        programStudiId: pasalPelanggaran.programStudiId,
        prodiNama: programStudi.nama,
        isActive: pasalPelanggaran.isActive,
        createdAt: pasalPelanggaran.createdAt,
        updatedAt: pasalPelanggaran.updatedAt,
      })
      .from(pasalPelanggaran)
      .leftJoin(programStudi, eq(pasalPelanggaran.programStudiId, programStudi.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(pasalPelanggaran.id));
  }

  static async create(data: {
    nomorPasal: string;
    bunyiPasal: string;
    bobotPoin: number;
    jenisSanksi: number;
    programStudiId?: number | null;
  }) {
    if (data.bobotPoin <= 0 || data.bobotPoin > 100) {
      throw new Error('Bobot poin pasal harus bernilai antara 1 dan 100.');
    }
    if (data.jenisSanksi !== 1 && data.jenisSanksi !== 4) {
      throw new Error('Jenis sanksi harus bernilai 1 (Lisan) atau 4 (Tertulis).');
    }
    const [created] = await db.insert(pasalPelanggaran).values(data).returning();
    return created;
  }

  static async update(
    id: number,
    data: Partial<{
      nomorPasal: string;
      bunyiPasal: string;
      bobotPoin: number;
      jenisSanksi: number;
      programStudiId?: number | null;
      isActive: boolean;
    }>,
  ) {
    if (data.bobotPoin !== undefined && (data.bobotPoin <= 0 || data.bobotPoin > 100)) {
      throw new Error('Bobot poin pasal harus bernilai antara 1 dan 100.');
    }
    if (data.jenisSanksi !== undefined && data.jenisSanksi !== 1 && data.jenisSanksi !== 4) {
      throw new Error('Jenis sanksi harus bernilai 1 (Lisan) atau 4 (Tertulis).');
    }
    const [updated] = await db.update(pasalPelanggaran).set(data).where(eq(pasalPelanggaran.id, id)).returning();
    return updated || null;
  }

  static async remove(id: number) {
    const [deleted] = await db.delete(pasalPelanggaran).where(eq(pasalPelanggaran.id, id)).returning();
    return deleted || null;
  }
}

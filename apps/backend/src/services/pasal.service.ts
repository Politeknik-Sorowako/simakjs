import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { pasalPelanggaran, pelanggaran, programStudi } from '../models/schema';
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
    jenisSanksi: number;
    programStudiId?: number | null;
  }) {
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
      jenisSanksi: number;
      programStudiId?: number | null;
      isActive: boolean;
    }>,
  ) {
    if (data.jenisSanksi !== undefined && data.jenisSanksi !== 1 && data.jenisSanksi !== 4) {
      throw new Error('Jenis sanksi harus bernilai 1 (Lisan) atau 4 (Tertulis).');
    }
    const [updated] = await db.update(pasalPelanggaran).set(data).where(eq(pasalPelanggaran.id, id)).returning();
    return updated || null;
  }

  static async remove(id: number) {
    return await db.transaction(async (tx) => {
      // Cek apakah pasal ini sedang digunakan di riwayat pelanggaran mahasiswa
      const usedInPelanggaran = await tx
        .select({ id: pelanggaran.id })
        .from(pelanggaran)
        .where(eq(pelanggaran.pasalId, id))
        .limit(1);

      if (usedInPelanggaran.length > 0) {
        const [targetPasal] = await tx
          .select({ nomorPasal: pasalPelanggaran.nomorPasal })
          .from(pasalPelanggaran)
          .where(eq(pasalPelanggaran.id, id));
        const nama = targetPasal?.nomorPasal || `ID ${id}`;
        throw new Error(`Pasal ${nama} tidak dapat dihapus karena sudah digunakan pada catatan pelanggaran aktif.`);
      }

      const [deleted] = await tx.delete(pasalPelanggaran).where(eq(pasalPelanggaran.id, id)).returning();
      return deleted || null;
    });
  }

  static async bulkRemove(ids: number[]) {
    if (!ids || ids.length === 0) {
      return { success: true, deletedCount: 0 };
    }

    return await db.transaction(async (tx) => {
      // Cek apakah ada pasal dalam daftar yang sedang digunakan pada data pelanggaran
      const usedViolations = await tx
        .select({ pasalId: pelanggaran.pasalId })
        .from(pelanggaran)
        .where(and(inArray(pelanggaran.pasalId, ids)));

      const usedPasalIds = Array.from(
        new Set(usedViolations.map((v) => v.pasalId).filter((id): id is number => id !== null)),
      );

      if (usedPasalIds.length > 0) {
        const usedPasalRows = await tx
          .select({ nomorPasal: pasalPelanggaran.nomorPasal })
          .from(pasalPelanggaran)
          .where(inArray(pasalPelanggaran.id, usedPasalIds));

        const names = usedPasalRows.map((p) => p.nomorPasal).join(', ');
        throw new Error(
          `Beberapa pasal tidak dapat dihapus karena sudah digunakan pada catatan pelanggaran aktif: ${names}`,
        );
      }

      const deletedRows = await tx.delete(pasalPelanggaran).where(inArray(pasalPelanggaran.id, ids)).returning();
      return { success: true, deletedCount: deletedRows.length };
    });
  }
}

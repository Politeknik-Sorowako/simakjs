import { asc, eq, sql } from 'drizzle-orm';
import { komponenNilai, mahasiswa, nilaiPraktik, rombelPraktikum, users } from '../models/schema';
import { db } from '../utils/db';

export class NilaiPraktikService {
  static async saveNilaiBulk(data: {
    rombelPraktikumId: number;
    nilaiList: Array<{
      mahasiswaId: number;
      komponenNilaiId?: number | null;
      nilaiAngka: number;
      keterangan?: string | null;
    }>;
    createdBy: number;
  }) {
    const [rombel] = await db
      .select({ id: rombelPraktikum.id })
      .from(rombelPraktikum)
      .where(eq(rombelPraktikum.id, data.rombelPraktikumId));
    if (!rombel) {
      throw new Error('Rombel praktikum tidak ditemukan');
    }

    for (const item of data.nilaiList) {
      if (item.nilaiAngka < 0 || item.nilaiAngka > 100) {
        throw new Error(`Nilai mahasiswa ${item.mahasiswaId} harus berada di rentang 0-100`);
      }
    }

    let creatorId: number | null = data.createdBy;
    if (creatorId) {
      const [u] = await db.select({ id: users.id }).from(users).where(eq(users.id, creatorId));
      if (!u) {
        console.warn(`[nilai-praktik] User with ID ${creatorId} not found in users table. Setting createdBy to null.`);
        creatorId = null;
      }
    }

    const itemsToInsert = data.nilaiList.map((item) => ({
      rombelPraktikumId: data.rombelPraktikumId,
      mahasiswaId: item.mahasiswaId,
      komponenNilaiId: item.komponenNilaiId ?? null,
      nilaiAngka: String(item.nilaiAngka),
      keterangan: item.keterangan || null,
      createdBy: creatorId,
    }));

    return await db.transaction(async (tx) => {
      const lockKey = `nilai_praktik_${data.rombelPraktikumId}`;
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`);

      await tx.delete(nilaiPraktik).where(eq(nilaiPraktik.rombelPraktikumId, data.rombelPraktikumId));
      if (itemsToInsert.length > 0) {
        await tx.insert(nilaiPraktik).values(itemsToInsert);
      }

      return { success: true, syncedCount: itemsToInsert.length };
    });
  }

  static async getNilaiByRombel(rombelPraktikumId: number) {
    const rows = await db
      .select({
        id: nilaiPraktik.id,
        rombelPraktikumId: nilaiPraktik.rombelPraktikumId,
        mahasiswaId: nilaiPraktik.mahasiswaId,
        mahasiswaNim: mahasiswa.nim,
        mahasiswaNama: mahasiswa.nama,
        komponenNilaiId: nilaiPraktik.komponenNilaiId,
        komponenNama: komponenNilai.nama,
        nilaiAngka: sql<string>`CAST(${nilaiPraktik.nilaiAngka} AS TEXT)`,
        keterangan: nilaiPraktik.keterangan,
        createdAt: nilaiPraktik.createdAt,
      })
      .from(nilaiPraktik)
      .innerJoin(mahasiswa, eq(nilaiPraktik.mahasiswaId, mahasiswa.id))
      .leftJoin(komponenNilai, eq(nilaiPraktik.komponenNilaiId, komponenNilai.id))
      .where(eq(nilaiPraktik.rombelPraktikumId, rombelPraktikumId))
      .orderBy(asc(mahasiswa.nama));
    return rows;
  }
}

import { and, eq, inArray } from 'drizzle-orm';
import {
  bap,
  bapPraktikum,
  dosen,
  krs,
  mahasiswa,
  nilaiKomponenMahasiswa,
  nilaiPraktik,
  presensi,
  presensiPraktikum,
  rombelPraktikum,
  rombelPraktikumMahasiswa,
} from '../models/schema';
import { db } from '../utils/db';

export class RombelPraktikumService {
  static async getByKelas(kelasKuliahId: number) {
    const list = await db.query.rombelPraktikum.findMany({
      where: eq(rombelPraktikum.kelasKuliahId, kelasKuliahId),
      with: {
        instruktur: true,
        mahasiswaList: {
          with: {
            mahasiswa: true,
          },
        },
      },
    });
    return list;
  }

  static async createRombel(data: {
    kelasKuliahId: number;
    namaGroup: string;
    instrukturId?: number | null;
    keterangan?: string | null;
  }) {
    const [newGroup] = await db.insert(rombelPraktikum).values(data).returning();
    return newGroup;
  }

  static async updateRombel(
    id: number,
    data: Partial<{
      namaGroup: string;
      instrukturId?: number | null;
      keterangan?: string | null;
    }>,
  ) {
    const [updated] = await db.update(rombelPraktikum).set(data).where(eq(rombelPraktikum.id, id)).returning();
    return updated || null;
  }

  static async deleteRombel(id: number) {
    const [deleted] = await db.delete(rombelPraktikum).where(eq(rombelPraktikum.id, id)).returning();
    return deleted || null;
  }

  static async assignMahasiswa(rombelPraktikumId: number, mahasiswaIds: number[]) {
    await db.delete(rombelPraktikumMahasiswa).where(eq(rombelPraktikumMahasiswa.rombelPraktikumId, rombelPraktikumId));

    if (mahasiswaIds.length > 0) {
      await db.insert(rombelPraktikumMahasiswa).values(
        mahasiswaIds.map((mhsId) => ({
          rombelPraktikumId,
          mahasiswaId: mhsId,
        })),
      );
    }
    return true;
  }

  // --- BAP PRAKTIKUM ---
  static async getBapByRombel(rombelPraktikumId: number) {
    return await db.query.bapPraktikum.findMany({
      where: eq(bapPraktikum.rombelPraktikumId, rombelPraktikumId),
      with: {
        instruktur: true,
        presensiList: true,
      },
    });
  }

  static async createBap(data: {
    rombelPraktikumId: number;
    tanggal: string;
    sesiKe: number;
    materi: string;
    catatan?: string | null;
    durasiMenit: number;
    instrukturId?: number | null;
  }) {
    const [newBap] = await db.insert(bapPraktikum).values(data).returning();
    return newBap;
  }

  static async updateBap(
    id: number,
    data: Partial<{
      tanggal: string;
      sesiKe: number;
      materi: string;
      catatan?: string | null;
      durasiMenit: number;
      instrukturId?: number | null;
    }>,
  ) {
    const [updated] = await db.update(bapPraktikum).set(data).where(eq(bapPraktikum.id, id)).returning();
    return updated || null;
  }

  static async savePresensiBulk(
    bapPraktikumId: number,
    presensiList: {
      mahasiswaId: number;
      status: 'hadir' | 'izin' | 'sakit' | 'alpa' | 'telat';
      durasiMangkir?: number;
      keterangan?: string;
    }[],
  ) {
    await db.delete(presensiPraktikum).where(eq(presensiPraktikum.bapPraktikumId, bapPraktikumId));

    if (presensiList.length > 0) {
      await db.insert(presensiPraktikum).values(
        presensiList.map((p) => ({
          bapPraktikumId,
          mahasiswaId: p.mahasiswaId,
          status: p.status,
          durasiMangkir: p.durasiMangkir || 0,
          keterangan: p.keterangan || null,
        })),
      );
    }
    return true;
  }

  static async getPresensiByBap(bapPraktikumId: number) {
    return await db.query.presensiPraktikum.findMany({
      where: eq(presensiPraktikum.bapPraktikumId, bapPraktikumId),
      with: {
        mahasiswa: true,
      },
    });
  }

  // --- SYNC ENGINE: PRAKTIKUM -> KELAS INDUK ---

  static async syncPresensiPraktikumToKelas(bapPraktikumId: number) {
    const [bapPrak] = await db.select().from(bapPraktikum).where(eq(bapPraktikum.id, bapPraktikumId));
    if (!bapPrak) {
      throw new Error('BAP praktikum tidak ditemukan');
    }

    const [rombel] = await db.select().from(rombelPraktikum).where(eq(rombelPraktikum.id, bapPrak.rombelPraktikumId));
    if (!rombel) {
      throw new Error('Rombel praktikum tidak ditemukan');
    }

    const presensiList = await db
      .select()
      .from(presensiPraktikum)
      .where(eq(presensiPraktikum.bapPraktikumId, bapPraktikumId));

    const dosenId = bapPrak.instrukturId ?? rombel.instrukturId;
    if (!dosenId) {
      throw new Error('Instruktur/dosen belum ditetapkan pada rombel atau BAP praktikum');
    }

    // Cari BAP teori pada kelas & tanggal yang sama agar sync idempotent
    let [bapTeori] = await db
      .select()
      .from(bap)
      .where(and(eq(bap.kelasKuliahId, rombel.kelasKuliahId), eq(bap.tanggal, bapPrak.tanggal)));

    if (!bapTeori) {
      const total = await db.$count(bap, eq(bap.kelasKuliahId, rombel.kelasKuliahId));
      const pertemuanKe = total + 1;

      [bapTeori] = await db
        .insert(bap)
        .values({
          kelasKuliahId: rombel.kelasKuliahId,
          tanggal: bapPrak.tanggal,
          pertemuanKe,
          materi: `[Praktikum] ${bapPrak.materi}`,
          catatan: bapPrak.catatan,
          durasiMenit: bapPrak.durasiMenit,
          dosenId,
        })
        .returning();
    }

    const itemsToInsert = presensiList.map((p) => ({
      bapId: bapTeori.id,
      mahasiswaId: p.mahasiswaId,
      status: p.status,
      durasiMangkir: p.durasiMangkir,
      keterangan: p.keterangan || null,
    }));

    await db.transaction(async (tx) => {
      await tx.delete(presensi).where(eq(presensi.bapId, bapTeori.id));
      if (itemsToInsert.length > 0) {
        await tx.insert(presensi).values(itemsToInsert);
      }
    });

    return { success: true, syncedCount: itemsToInsert.length, bapTeoriId: bapTeori.id };
  }

  static async syncNilaiPraktikumToKelas(rombelPraktikumId: number) {
    const [rombel] = await db.select().from(rombelPraktikum).where(eq(rombelPraktikum.id, rombelPraktikumId));
    if (!rombel) {
      throw new Error('Rombel praktikum tidak ditemukan');
    }

    const nilaiList = await db.select().from(nilaiPraktik).where(eq(nilaiPraktik.rombelPraktikumId, rombelPraktikumId));

    if (nilaiList.length === 0) {
      return { success: true, syncedCount: 0 };
    }

    const mhsIds = [...new Set(nilaiList.map((n) => n.mahasiswaId))];
    const krsList = await db
      .select()
      .from(krs)
      .where(and(inArray(krs.mahasiswaId, mhsIds), eq(krs.kelasKuliahId, rombel.kelasKuliahId)));

    const krsMap = new Map(krsList.map((k) => [k.mahasiswaId, k]));

    // Rata-rata nilai praktikum per mahasiswa per komponen
    const nilaiPerKomponen = new Map<string, { nilai: number; count: number }>();
    for (const n of nilaiList) {
      const key = `${n.mahasiswaId}:${n.komponenNilaiId ?? 'x'}`;
      const cur = nilaiPerKomponen.get(key) || { nilai: 0, count: 0 };
      nilaiPerKomponen.set(key, { nilai: cur.nilai + Number(n.nilaiAngka), count: cur.count + 1 });
    }

    let syncedCount = 0;

    await db.transaction(async (tx) => {
      for (const [key, agg] of nilaiPerKomponen) {
        const [mhsIdStr, komponenIdStr] = key.split(':');
        const mhsId = parseInt(mhsIdStr);
        const krsRecord = krsMap.get(mhsId);
        if (!krsRecord) continue;

        const komponenId = komponenIdStr === 'x' ? null : parseInt(komponenIdStr);
        const nilaiRata = agg.nilai / agg.count;

        if (komponenId !== null) {
          const existing = await tx
            .select({ id: nilaiKomponenMahasiswa.id })
            .from(nilaiKomponenMahasiswa)
            .where(
              and(
                eq(nilaiKomponenMahasiswa.krsId, krsRecord.id),
                eq(nilaiKomponenMahasiswa.komponenNilaiId, komponenId),
              ),
            );
          if (existing.length > 0) {
            await tx
              .update(nilaiKomponenMahasiswa)
              .set({ nilai: String(nilaiRata.toFixed(2)) })
              .where(eq(nilaiKomponenMahasiswa.id, existing[0].id));
          } else {
            await tx.insert(nilaiKomponenMahasiswa).values({
              krsId: krsRecord.id,
              komponenNilaiId: komponenId,
              nilai: String(nilaiRata.toFixed(2)),
            });
          }
          syncedCount++;
        } else {
          await tx
            .update(krs)
            .set({ nilaiAngka: String(nilaiRata.toFixed(2)) })
            .where(eq(krs.id, krsRecord.id));
          syncedCount++;
        }
      }
    });

    return { success: true, syncedCount };
  }
}

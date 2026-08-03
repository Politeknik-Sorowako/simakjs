import { eq, inArray } from 'drizzle-orm';
import {
  bapPraktikum,
  mahasiswa,
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
}

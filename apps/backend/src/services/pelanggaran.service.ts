import { desc, eq } from 'drizzle-orm';
import { mahasiswa, pelanggaran, programStudi } from '../models/schema';
import { db } from '../utils/db';

export class PelanggaranService {
  static async createPelanggaran(data: {
    mahasiswaId: number;
    tanggal: string;
    jenisPelanggaran: string;
    bobotPoin: number;
    keterangan: string;
    dibuatOleh?: number;
  }) {
    if (data.bobotPoin <= 0 || data.bobotPoin > 100) {
      throw new Error('Bobot poin pelanggaran harus bernilai antara 1 dan 100.');
    }

    const [mhs] = await db.select().from(mahasiswa).where(eq(mahasiswa.id, data.mahasiswaId));
    if (!mhs) {
      throw new Error('Mahasiswa tidak ditemukan.');
    }

    const [newPelanggaran] = await db.insert(pelanggaran).values(data).returning();
    return newPelanggaran;
  }

  static async getPelanggaranByMahasiswa(mahasiswaId: number) {
    const list = await db
      .select({
        id: pelanggaran.id,
        tanggal: pelanggaran.tanggal,
        jenisPelanggaran: pelanggaran.jenisPelanggaran,
        bobotPoin: pelanggaran.bobotPoin,
        keterangan: pelanggaran.keterangan,
        createdAt: pelanggaran.createdAt,
      })
      .from(pelanggaran)
      .where(eq(pelanggaran.mahasiswaId, mahasiswaId))
      .orderBy(desc(pelanggaran.tanggal));

    const totalPoin = list.reduce((sum, item) => sum + item.bobotPoin, 0);

    return {
      pelanggaranList: list,
      totalPoin,
    };
  }

  static async getAllPelanggaran() {
    return await db
      .select({
        id: pelanggaran.id,
        mahasiswaId: pelanggaran.mahasiswaId,
        nim: mahasiswa.nim,
        namaMahasiswa: mahasiswa.nama,
        prodiNama: programStudi.nama,
        tanggal: pelanggaran.tanggal,
        jenisPelanggaran: pelanggaran.jenisPelanggaran,
        bobotPoin: pelanggaran.bobotPoin,
        keterangan: pelanggaran.keterangan,
        createdAt: pelanggaran.createdAt,
      })
      .from(pelanggaran)
      .innerJoin(mahasiswa, eq(pelanggaran.mahasiswaId, mahasiswa.id))
      .leftJoin(programStudi, eq(mahasiswa.programStudiId, programStudi.id))
      .orderBy(desc(pelanggaran.tanggal));
  }

  static async updatePelanggaran(
    id: number,
    data: Partial<{
      tanggal: string;
      jenisPelanggaran: string;
      bobotPoin: number;
      keterangan: string;
    }>,
  ) {
    if (data.bobotPoin !== undefined && (data.bobotPoin <= 0 || data.bobotPoin > 100)) {
      throw new Error('Bobot poin pelanggaran harus bernilai antara 1 dan 100.');
    }
    const [updated] = await db.update(pelanggaran).set(data).where(eq(pelanggaran.id, id)).returning();
    return updated || null;
  }
}

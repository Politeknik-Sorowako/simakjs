import { and, count, desc, eq, sql, sum } from 'drizzle-orm';
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

  static async getRekap(periodeId?: string, programStudiId?: number) {
    const { mahasiswa: mhs, programStudi: ps } = await import('../models/schema');

    const conditions: any[] = [];
    if (programStudiId) conditions.push(eq(mhs.programStudiId, programStudiId));
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totals] = await db
      .select({ totalPelanggaran: count(), totalMahasiswa: sql<number>`count(distinct ${pelanggaran.mahasiswaId})` })
      .from(pelanggaran)
      .innerJoin(mhs, eq(pelanggaran.mahasiswaId, mhs.id))
      .where(whereClause);

    const perJenis = await db
      .select({
        jenis: pelanggaran.jenisPelanggaran,
        jumlah: count(),
        totalPoin: sum(pelanggaran.bobotPoin),
      })
      .from(pelanggaran)
      .innerJoin(mhs, eq(pelanggaran.mahasiswaId, mhs.id))
      .where(whereClause)
      .groupBy(pelanggaran.jenisPelanggaran)
      .orderBy(sql`count(*) DESC`);

    const perProdi = await db
      .select({
        prodiId: mhs.programStudiId,
        prodiNama: ps.nama,
        totalPelanggaran: count(),
        totalPoin: sum(pelanggaran.bobotPoin),
      })
      .from(pelanggaran)
      .innerJoin(mhs, eq(pelanggaran.mahasiswaId, mhs.id))
      .leftJoin(ps, eq(mhs.programStudiId, ps.id))
      .where(whereClause)
      .groupBy(mhs.programStudiId, ps.nama);

    const topPelanggar = await db
      .select({
        mahasiswaId: pelanggaran.mahasiswaId,
        nim: mhs.nim,
        nama: mhs.nama,
        totalPoin: sum(pelanggaran.bobotPoin),
        jumlahPelanggaran: count(),
      })
      .from(pelanggaran)
      .innerJoin(mhs, eq(pelanggaran.mahasiswaId, mhs.id))
      .where(whereClause)
      .groupBy(pelanggaran.mahasiswaId, mhs.nim, mhs.nama)
      .orderBy(sql`SUM(${pelanggaran.bobotPoin}) DESC`)
      .limit(10);

    return {
      totalPelanggaran: Number(totals?.totalPelanggaran || 0),
      totalMahasiswa: Number(totals?.totalMahasiswa || 0),
      perJenis: perJenis.map((j) => ({
        jenis: j.jenis,
        jumlah: Number(j.jumlah),
        totalPoin: Number(j.totalPoin || 0),
      })),
      perProdi: perProdi.map((p) => ({
        prodiId: p.prodiId,
        prodiNama: p.prodiNama || '-',
        totalPelanggaran: Number(p.totalPelanggaran),
        totalPoin: Number(p.totalPoin || 0),
      })),
      topPelanggar: topPelanggar.map((t) => ({
        mahasiswaId: t.mahasiswaId,
        nim: t.nim,
        nama: t.nama,
        totalPoin: Number(t.totalPoin || 0),
        jumlahPelanggaran: Number(t.jumlahPelanggaran),
      })),
    };
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

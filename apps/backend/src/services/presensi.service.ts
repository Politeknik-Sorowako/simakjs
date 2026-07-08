import { and, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { bap, kompensasiBayar, mahasiswa, presensi, programStudi } from '../models/schema';
import { db } from '../utils/db';

export class PresensiService {
  static async saveBulkPresensi(
    bapId: number,
    presensiList: Array<{ mahasiswaId: number; status: string; durasiMangkir?: number }>,
  ) {
    const [foundBap] = await db.select().from(bap).where(eq(bap.id, bapId));
    if (!foundBap) {
      throw new Error('BAP tidak ditemukan');
    }

    const itemsToInsert = presensiList.map((item) => {
      let durMangkir = item.durasiMangkir || 0;
      const status = item.status;

      if (status === 'alpa' || status === 'sakit' || status === 'izin') {
        durMangkir = foundBap.durasiMenit;
      } else if (status === 'telat') {
        durMangkir = Math.min(item.durasiMangkir || 0, foundBap.durasiMenit);
      } else if (status === 'hadir') {
        durMangkir = 0;
      }

      return {
        bapId,
        mahasiswaId: item.mahasiswaId,
        status: status as 'hadir' | 'sakit' | 'izin' | 'telat' | 'alpa',
        durasiMangkir: durMangkir,
      };
    });

    await db.transaction(async (tx) => {
      await tx.delete(presensi).where(eq(presensi.bapId, bapId));
      if (itemsToInsert.length > 0) {
        await tx.insert(presensi).values(itemsToInsert);
      }
    });

    return { message: 'Presensi berhasil disimpan' };
  }

  static async getPresensiByBap(bapId: number) {
    const rows = await db
      .select({
        id: presensi.id,
        mahasiswaId: presensi.mahasiswaId,
        mahasiswaNim: mahasiswa.nim,
        mahasiswaNama: mahasiswa.nama,
        status: presensi.status,
        durasiMangkir: presensi.durasiMangkir,
      })
      .from(presensi)
      .innerJoin(mahasiswa, eq(presensi.mahasiswaId, mahasiswa.id))
      .where(eq(presensi.bapId, bapId));
    return rows;
  }

  static calculateKompensasiMinutes(status: string, durasiMangkir: number): number {
    switch (status) {
      case 'alpa':
      case 'telat':
        return durasiMangkir * 5;
      case 'sakit':
      case 'izin':
        return durasiMangkir * 1;
      case 'hadir':
      default:
        return 0;
    }
  }

  static async getKompensasiDetail(mahasiswaId: number) {
    const [mhs] = await db
      .select({
        id: mahasiswa.id,
        nim: mahasiswa.nim,
        nama: mahasiswa.nama,
        email: mahasiswa.email,
        programStudiId: mahasiswa.programStudiId,
      })
      .from(mahasiswa)
      .where(eq(mahasiswa.id, mahasiswaId));

    if (!mhs) {
      throw new Error('Mahasiswa tidak ditemukan');
    }

    const presensiList = await db
      .select({
        id: presensi.id,
        bapId: presensi.bapId,
        status: presensi.status,
        durasiMangkir: presensi.durasiMangkir,
        createdAt: presensi.createdAt,
        bapPertemuan: bap.pertemuanKe,
        bapMateri: bap.materi,
        bapTanggal: bap.tanggal,
      })
      .from(presensi)
      .innerJoin(bap, eq(presensi.bapId, bap.id))
      .where(eq(presensi.mahasiswaId, mahasiswaId));

    const historyKompensasi = presensiList
      .map((p) => {
        const poinKompensasi = this.calculateKompensasiMinutes(p.status, p.durasiMangkir);
        return {
          ...p,
          poinKompensasi,
        };
      })
      .filter((p) => p.poinKompensasi > 0);

    const totalKompensasi = historyKompensasi.reduce((sum, item) => sum + item.poinKompensasi, 0);

    const payments = await db.select().from(kompensasiBayar).where(eq(kompensasiBayar.mahasiswaId, mahasiswaId));

    const totalDibayar = payments.reduce((sum, p) => sum + p.jumlahMenit, 0);
    const sisaKompensasi = Math.max(0, totalKompensasi - totalDibayar);

    return {
      mahasiswa: mhs,
      historyKompensasi,
      payments,
      summary: {
        totalKompensasi,
        totalDibayar,
        sisaKompensasi,
      },
    };
  }

  static async getLaporanKompensasi(page = 1, limit = 20, search?: string, prodiId?: number) {
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    if (search) {
      conditions.push(or(ilike(mahasiswa.nama, `%${search}%`), ilike(mahasiswa.nim, `%${search}%`)));
    }
    if (prodiId) {
      conditions.push(eq(mahasiswa.programStudiId, prodiId));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const listMahasiswa = await db
      .select({
        id: mahasiswa.id,
        nim: mahasiswa.nim,
        nama: mahasiswa.nama,
        prodiNama: programStudi.nama,
      })
      .from(mahasiswa)
      .leftJoin(programStudi, eq(mahasiswa.programStudiId, programStudi.id))
      .where(whereClause)
      .limit(limit)
      .offset(offset);

    const allPresensi = await db
      .select({
        mahasiswaId: presensi.mahasiswaId,
        status: presensi.status,
        durasiMangkir: presensi.durasiMangkir,
      })
      .from(presensi);

    const allPayments = await db
      .select({
        mahasiswaId: kompensasiBayar.mahasiswaId,
        jumlahMenit: kompensasiBayar.jumlahMenit,
      })
      .from(kompensasiBayar);

    const mapPresensi = new Map<number, number>();
    for (const p of allPresensi) {
      const minutes = this.calculateKompensasiMinutes(p.status, p.durasiMangkir);
      mapPresensi.set(p.mahasiswaId, (mapPresensi.get(p.mahasiswaId) || 0) + minutes);
    }

    const mapPayments = new Map<number, number>();
    for (const pay of allPayments) {
      mapPayments.set(pay.mahasiswaId, (mapPayments.get(pay.mahasiswaId) || 0) + pay.jumlahMenit);
    }

    const [totalResult] = await db
      .select({ total: sql<number>`count(*)` })
      .from(mahasiswa)
      .where(whereClause);

    const total = Number(totalResult?.total || 0);
    const totalPages = Math.ceil(total / limit);

    const data = listMahasiswa.map((mhs) => {
      const totalKompensasi = mapPresensi.get(mhs.id) || 0;
      const totalDibayar = mapPayments.get(mhs.id) || 0;
      const sisaKompensasi = Math.max(0, totalKompensasi - totalDibayar);
      return { ...mhs, totalKompensasi, totalDibayar, sisaKompensasi };
    });

    return { data, meta: { total, page, limit, totalPages } };
  }

  static async getLaporanKompensasiStats() {
    const allMahasiswa = await db
      .select({
        id: mahasiswa.id,
        programStudiId: mahasiswa.programStudiId,
        prodiNama: programStudi.nama,
      })
      .from(mahasiswa)
      .leftJoin(programStudi, eq(mahasiswa.programStudiId, programStudi.id));

    const allPresensi = await db
      .select({
        mahasiswaId: presensi.mahasiswaId,
        status: presensi.status,
        durasiMangkir: presensi.durasiMangkir,
      })
      .from(presensi);

    const allPayments = await db
      .select({
        mahasiswaId: kompensasiBayar.mahasiswaId,
        jumlahMenit: kompensasiBayar.jumlahMenit,
      })
      .from(kompensasiBayar);

    const mapPresensi = new Map<number, number>();
    for (const p of allPresensi) {
      const minutes = this.calculateKompensasiMinutes(p.status, p.durasiMangkir);
      mapPresensi.set(p.mahasiswaId, (mapPresensi.get(p.mahasiswaId) || 0) + minutes);
    }

    const mapPayments = new Map<number, number>();
    for (const pay of allPayments) {
      mapPayments.set(pay.mahasiswaId, (mapPayments.get(pay.mahasiswaId) || 0) + pay.jumlahMenit);
    }

    let totalKomp = 0, totalDby = 0;
    const prodiMap = new Map<string, { prodiNama: string; jumlahMahasiswa: number; totalKompensasi: number; totalDibayar: number; sisaKompensasi: number }>();
    const mhsList: any[] = [];

    for (const mhs of allMahasiswa) {
      const totalKompensasi = mapPresensi.get(mhs.id) || 0;
      const totalDibayar = mapPayments.get(mhs.id) || 0;
      const sisaKompensasi = Math.max(0, totalKompensasi - totalDibayar);

      totalKomp += totalKompensasi;
      totalDby += totalDibayar;

      const prodi = mhs.prodiNama || 'Tanpa Prodi';
      const existing = prodiMap.get(prodi) || { prodiNama: prodi, jumlahMahasiswa: 0, totalKompensasi: 0, totalDibayar: 0, sisaKompensasi: 0 };
      existing.jumlahMahasiswa++;
      existing.totalKompensasi += totalKompensasi;
      existing.totalDibayar += totalDibayar;
      existing.sisaKompensasi += sisaKompensasi;
      prodiMap.set(prodi, existing);

      if (totalKompensasi > 0 || totalDibayar > 0) {
        mhsList.push({ id: mhs.id, nama: '', nim: '', prodiNama: prodi, totalKompensasi, totalDibayar, sisaKompensasi });
      }
    }

    const rekapProdi = [...prodiMap.values()].sort((a, b) => b.sisaKompensasi - a.sisaKompensasi);

    // Top 10 by sisaKompensasi (we need names: fetch from full list)
    const mhsFull = await db
      .select({ id: mahasiswa.id, nama: mahasiswa.nama, nim: mahasiswa.nim })
      .from(mahasiswa);

    const mhsNameMap = new Map(mhsFull.map((m) => [m.id, m]));

    const mhsAgg = allMahasiswa.map((mhs) => {
      const nama = mhsNameMap.get(mhs.id)?.nama || '';
      const nim = mhsNameMap.get(mhs.id)?.nim || '';
      const totalKompensasi = mapPresensi.get(mhs.id) || 0;
      const totalDibayar = mapPayments.get(mhs.id) || 0;
      const sisaKompensasi = Math.max(0, totalKompensasi - totalDibayar);
      return { id: mhs.id, nama, nim, prodiNama: mhs.prodiNama || 'Tanpa Prodi', totalKompensasi, totalDibayar, sisaKompensasi };
    });

    const top10 = mhsAgg.filter((m) => m.sisaKompensasi > 0).sort((a, b) => b.sisaKompensasi - a.sisaKompensasi).slice(0, 10);

    const totalSisa = Math.max(0, totalKomp - totalDby);

    return {
      summary: { totalMahasiswa: allMahasiswa.length, totalKompensasi: totalKomp, totalDibayar: totalDby, totalSisa },
      rekapProdi,
      top10,
    };
  }

  static async bayarKompensasi(data: {
    mahasiswaId: number;
    jumlahMenit: number;
    tanggal: string;
    keterangan: string;
    petugasId?: number;
  }) {
    const [newPayment] = await db.insert(kompensasiBayar).values(data).returning();
    return newPayment;
  }

  static async updateKompensasiBayar(
    id: number,
    data: Partial<{
      jumlahMenit: number;
      tanggal: string;
      keterangan: string;
    }>,
  ) {
    const [updated] = await db.update(kompensasiBayar).set(data).where(eq(kompensasiBayar.id, id)).returning();
    return updated || null;
  }
}

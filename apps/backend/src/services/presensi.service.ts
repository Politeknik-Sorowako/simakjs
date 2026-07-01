import { db } from '../utils/db';
import { presensi, bap, mahasiswa, kompensasiBayar, programStudi } from '../models/schema';
import { eq, inArray } from 'drizzle-orm';

export class PresensiService {
  static async saveBulkPresensi(bapId: number, presensiList: Array<{ mahasiswaId: number; status: string; durasiMangkir?: number }>) {
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

    const payments = await db
      .select()
      .from(kompensasiBayar)
      .where(eq(kompensasiBayar.mahasiswaId, mahasiswaId));

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

  static async getLaporanKompensasi() {
    const listMahasiswa = await db
      .select({
        id: mahasiswa.id,
        nim: mahasiswa.nim,
        nama: mahasiswa.nama,
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

    return listMahasiswa.map((mhs) => {
      const totalKompensasi = mapPresensi.get(mhs.id) || 0;
      const totalDibayar = mapPayments.get(mhs.id) || 0;
      const sisaKompensasi = Math.max(0, totalKompensasi - totalDibayar);

      return {
        ...mhs,
        totalKompensasi,
        totalDibayar,
        sisaKompensasi,
      };
    });
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

  static async updateKompensasiBayar(id: number, data: Partial<{
    jumlahMenit: number;
    tanggal: string;
    keterangan: string;
  }>) {
    const [updated] = await db
      .update(kompensasiBayar)
      .set(data)
      .where(eq(kompensasiBayar.id, id))
      .returning();
    return updated || null;
  }
}

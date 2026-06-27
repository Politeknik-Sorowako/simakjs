import { db } from '../utils/db';
import { krs, mahasiswa, kelasKuliah, mataKuliah, tagihan } from '../models/schema';
import { eq, and, isNotNull } from 'drizzle-orm';
import { PresensiService } from './presensi.service';

export interface KhsSummary {
  totalSks: number;
  ipSemester: number;
  ipk: number;
}

export class KhsService {
  static async checkBebasTanggungan(mahasiswaId: number, activePeriodeId: string) {
    // 1. Check SPP Tagihan for active semester
    const unpaidBill = await db.query.tagihan.findFirst({
      where: and(
        eq(tagihan.mahasiswaId, mahasiswaId),
        eq(tagihan.periodeId, activePeriodeId),
        eq(tagihan.status, 'belum_bayar')
      )
    });

    if (unpaidBill) {
      return {
        bebas: false,
        reason: 'SPP Belum Lunas',
        detail: `Terdapat tunggakan SPP sebesar Rp ${unpaidBill.nominal.toLocaleString('id-ID')} untuk periode ${activePeriodeId}.`
      };
    }

    // 2. Check remaining Jam Kompensasi
    try {
      const komDetail = await PresensiService.getKompensasiDetail(mahasiswaId);
      if (komDetail.summary.sisaKompensasi > 0) {
        return {
          bebas: false,
          reason: 'Tunggakan Kompensasi',
          detail: `Anda memiliki sisa kewajiban jam kompensasi sebanyak ${komDetail.summary.sisaKompensasi} menit.`
        };
      }
    } catch (e) {
      // Ignore if student not found or no attendance recorded yet
    }

    return { bebas: true, reason: null, detail: null };
  }

  static async getKhs(mahasiswaId: number, periodeId: string) {
    // Fetch KHS list
    const krsList = await db
      .select({
        id: krs.id,
        nilaiAngka: krs.nilaiAngka,
        nilaiHuruf: krs.nilaiHuruf,
        nilaiIndeks: krs.nilaiIndeks,
        isApproved: krs.isApproved,
        kelasKuliah: {
          id: kelasKuliah.id,
          namaKelas: kelasKuliah.namaKelas
        },
        mataKuliah: {
          id: mataKuliah.id,
          kode: mataKuliah.kode,
          nama: mataKuliah.nama,
          sksTotal: mataKuliah.sksTotal
        }
      })
      .from(krs)
      .innerJoin(kelasKuliah, eq(krs.kelasKuliahId, kelasKuliah.id))
      .innerJoin(mataKuliah, eq(kelasKuliah.mataKuliahId, mataKuliah.id))
      .where(
        and(
          eq(krs.mahasiswaId, mahasiswaId),
          eq(kelasKuliah.periodeId, periodeId),
          eq(krs.isApproved, true)
        )
      );

    // Calculate Semester Stats
    let totalSks = 0;
    let weightedPoints = 0;

    for (const item of krsList) {
      const sks = item.mataKuliah.sksTotal;
      const index = item.nilaiIndeks ? parseFloat(item.nilaiIndeks) : null;
      if (index !== null) {
        totalSks += sks;
        weightedPoints += index * sks;
      }
    }

    const ipSemester = totalSks > 0 ? parseFloat((weightedPoints / totalSks).toFixed(2)) : 0.0;

    // Calculate Cumulative GPA (IPK)
    const allApprovedKrs = await db
      .select({
        nilaiIndeks: krs.nilaiIndeks,
        sksTotal: mataKuliah.sksTotal
      })
      .from(krs)
      .innerJoin(kelasKuliah, eq(krs.kelasKuliahId, kelasKuliah.id))
      .innerJoin(mataKuliah, eq(kelasKuliah.mataKuliahId, mataKuliah.id))
      .where(
        and(
          eq(krs.mahasiswaId, mahasiswaId),
          eq(krs.isApproved, true),
          isNotNull(krs.nilaiIndeks)
        )
      );

    let totalSksKumulatif = 0;
    let weightedPointsKumulatif = 0;

    for (const item of allApprovedKrs) {
      const sks = item.sksTotal;
      const index = item.nilaiIndeks ? parseFloat(item.nilaiIndeks) : null;
      if (index !== null) {
        totalSksKumulatif += sks;
        weightedPointsKumulatif += index * sks;
      }
    }

    const ipk = totalSksKumulatif > 0 ? parseFloat((weightedPointsKumulatif / totalSksKumulatif).toFixed(2)) : 0.0;

    return {
      krsList,
      summary: {
        totalSks,
        ipSemester,
        ipk,
        totalSksKumulatif
      }
    };
  }

  static async getTranskrip(mahasiswaId: number) {
    const list = await db
      .select({
        id: krs.id,
        nilaiAngka: krs.nilaiAngka,
        nilaiHuruf: krs.nilaiHuruf,
        nilaiIndeks: krs.nilaiIndeks,
        periodeId: kelasKuliah.periodeId,
        mataKuliah: {
          kode: mataKuliah.kode,
          nama: mataKuliah.nama,
          sksTotal: mataKuliah.sksTotal
        }
      })
      .from(krs)
      .innerJoin(kelasKuliah, eq(krs.kelasKuliahId, kelasKuliah.id))
      .innerJoin(mataKuliah, eq(kelasKuliah.mataKuliahId, mataKuliah.id))
      .where(
        and(
          eq(krs.mahasiswaId, mahasiswaId),
          eq(krs.isApproved, true),
          isNotNull(krs.nilaiIndeks)
        )
      );

    let totalSks = 0;
    let weightedPoints = 0;

    for (const item of list) {
      const sks = item.mataKuliah.sksTotal;
      const index = item.nilaiIndeks ? parseFloat(item.nilaiIndeks) : null;
      if (index !== null) {
        totalSks += sks;
        weightedPoints += index * sks;
      }
    }

    const ipk = totalSks > 0 ? parseFloat((weightedPoints / totalSks).toFixed(2)) : 0.0;

    return {
      transkripList: list,
      summary: {
        totalSks,
        ipk
      }
    };
  }
}

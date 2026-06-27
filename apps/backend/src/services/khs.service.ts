import { db } from '../utils/db';
import { krs, mahasiswa, kelasKuliah, mataKuliah, tagihan, bimbingan, bap, presensi } from '../models/schema';
import { eq, and, isNotNull, inArray } from 'drizzle-orm';
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

  static async getExamEligibility(mahasiswaId: number, activePeriodeId: string) {
    const bimb = await db.query.bimbingan.findFirst({
      where: and(
        eq(bimbingan.mahasiswaId, mahasiswaId),
        eq(bimbingan.periodeId, activePeriodeId)
      ),
      with: {
        thread: true
      }
    });

    const hasBimbinganApproved = bimb?.isApproved === true;
    const threadCount = bimb?.thread?.length || 0;
    const bimbinganEligible = hasBimbinganApproved || threadCount >= 3;

    const studentKrs = await db
      .select({
        krsId: krs.id,
        kelasKuliahId: krs.kelasKuliahId,
        namaKelas: kelasKuliah.namaKelas,
        mataKuliahNama: mataKuliah.nama,
        mataKuliahKode: mataKuliah.kode
      })
      .from(krs)
      .innerJoin(kelasKuliah, eq(krs.kelasKuliahId, kelasKuliah.id))
      .innerJoin(mataKuliah, eq(kelasKuliah.mataKuliahId, mataKuliah.id))
      .where(
        and(
          eq(krs.mahasiswaId, mahasiswaId),
          eq(kelasKuliah.periodeId, activePeriodeId),
          eq(krs.isApproved, true)
        )
      );

    const classIds = studentKrs.map(k => k.kelasKuliahId);
    const classEligibility = [];

    if (classIds.length > 0) {
      // Fetch all BAP records for these classes
      const allBaps = await db
        .select()
        .from(bap)
        .where(inArray(bap.kelasKuliahId, classIds));

      // Group BAPs by class ID
      const bapsByClass = new Map<number, typeof bap.$inferSelect[]>();
      for (const b of allBaps) {
        const arr = bapsByClass.get(b.kelasKuliahId) || [];
        arr.push(b);
        bapsByClass.set(b.kelasKuliahId, arr);
      }

      // Fetch all presensi records for these BAP records of the student
      const bapIds = allBaps.map(b => b.id);
      const presentBapIds = new Set<number>();

      if (bapIds.length > 0) {
        const studentPresensi = await db
          .select()
          .from(presensi)
          .where(
            and(
              eq(presensi.mahasiswaId, mahasiswaId),
              inArray(presensi.bapId, bapIds)
            )
          );

        for (const p of studentPresensi) {
          if (p.status === 'hadir' || p.status === 'telat') {
            presentBapIds.add(p.bapId);
          }
        }
      }

      for (const item of studentKrs) {
        const meetings = bapsByClass.get(item.kelasKuliahId) || [];
        const totalMeetings = meetings.length;
        let presentMeetings = 0;

        for (const m of meetings) {
          if (presentBapIds.has(m.id)) {
            presentMeetings++;
          }
        }

        const attendanceRate = totalMeetings > 0 ? (presentMeetings / totalMeetings) * 100 : 100;
        const attendanceEligible = attendanceRate >= 80;

        classEligibility.push({
          kelasKuliahId: item.kelasKuliahId,
          namaKelas: item.namaKelas,
          mataKuliahNama: item.mataKuliahNama,
          mataKuliahKode: item.mataKuliahKode,
          totalMeetings,
          presentMeetings,
          attendanceRate: parseFloat(attendanceRate.toFixed(2)),
          eligible: attendanceEligible && bimbinganEligible,
          reasons: {
            attendance: attendanceEligible ? 'Lolos (>= 80%)' : `Kehadiran kurang (${attendanceRate.toFixed(1)}% < 80%)`,
            bimbingan: bimbinganEligible ? 'Lolos' : 'Bimbingan PA belum terpenuhi (min. 3 interaksi)'
          }
        });
      }
    }

    const overallEligible = classEligibility.every(c => c.eligible);

    return {
      mahasiswaId,
      periodeId: activePeriodeId,
      bimbingan: {
        isApproved: bimb?.isApproved || false,
        interactionsCount: threadCount,
        eligible: bimbinganEligible
      },
      classes: classEligibility,
      overallEligible
    };
  }
}

import { and, eq, inArray, isNotNull } from 'drizzle-orm';
import {
  bap,
  bimbingan,
  kelasKuliah,
  konversiNilai,
  krs,
  mahasiswa,
  mataKuliah,
  presensi,
  programStudi,
  skalaPredikatKelulusan,
  tagihan,
} from '../models/schema';
import { db } from '../utils/db';
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
        eq(tagihan.status, 'belum_bayar'),
      ),
    });

    if (unpaidBill) {
      return {
        bebas: false,
        reason: 'SPP Belum Lunas',
        detail: `Terdapat tunggakan SPP sebesar Rp ${unpaidBill.nominal.toLocaleString('id-ID')} untuk periode ${activePeriodeId}.`,
      };
    }

    // 2. Check remaining Jam Kompensasi
    try {
      const komDetail = await PresensiService.getKompensasiDetail(mahasiswaId);
      if (komDetail.summary.sisaKompensasi > 0) {
        return {
          bebas: false,
          reason: 'Tunggakan Kompensasi',
          detail: `Anda memiliki sisa kewajiban jam kompensasi sebanyak ${komDetail.summary.sisaKompensasi} menit.`,
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
          namaKelas: kelasKuliah.namaKelas,
        },
        mataKuliah: {
          id: mataKuliah.id,
          kode: mataKuliah.kode,
          nama: mataKuliah.nama,
          sksTotal: mataKuliah.sksTotal,
        },
      })
      .from(krs)
      .innerJoin(kelasKuliah, eq(krs.kelasKuliahId, kelasKuliah.id))
      .innerJoin(mataKuliah, eq(kelasKuliah.mataKuliahId, mataKuliah.id))
      .where(and(eq(krs.mahasiswaId, mahasiswaId), eq(kelasKuliah.periodeId, periodeId), eq(krs.isApproved, true)));

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
        sksTotal: mataKuliah.sksTotal,
      })
      .from(krs)
      .innerJoin(kelasKuliah, eq(krs.kelasKuliahId, kelasKuliah.id))
      .innerJoin(mataKuliah, eq(kelasKuliah.mataKuliahId, mataKuliah.id))
      .where(and(eq(krs.mahasiswaId, mahasiswaId), eq(krs.isApproved, true), isNotNull(krs.nilaiIndeks)));

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
        totalSksKumulatif,
      },
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
          sksTotal: mataKuliah.sksTotal,
        },
      })
      .from(krs)
      .innerJoin(kelasKuliah, eq(krs.kelasKuliahId, kelasKuliah.id))
      .innerJoin(mataKuliah, eq(kelasKuliah.mataKuliahId, mataKuliah.id))
      .where(and(eq(krs.mahasiswaId, mahasiswaId), eq(krs.isApproved, true), isNotNull(krs.nilaiIndeks)));

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

    // Get dynamic predikat
    let predikatKelulusan = '-';
    const predikats = await db.select().from(skalaPredikatKelulusan);
    for (const p of predikats) {
      const min = parseFloat(p.ipkMin);
      const max = parseFloat(p.ipkMax);
      if (ipk >= min && ipk <= max) {
        predikatKelulusan = p.predikat;
        break;
      }
    }

    const mhsDetail = await db.query.mahasiswa.findFirst({
      where: eq(mahasiswa.id, mahasiswaId),
      with: {
        programStudi: true,
      },
    });

    const formattedList = list.map((item) => ({
      mataKuliahKode: item.mataKuliah.kode,
      mataKuliahNama: item.mataKuliah.nama,
      sks: item.mataKuliah.sksTotal,
      nilaiHuruf: item.nilaiHuruf || '-',
      nilaiIndeks: item.nilaiIndeks || '0.00',
    }));

    return {
      mahasiswa: mhsDetail
        ? {
            id: mhsDetail.id,
            nim: mhsDetail.nim,
            nama: mhsDetail.nama,
            prodi: mhsDetail.programStudi?.nama || '-',
          }
        : undefined,
      transkripList: formattedList,
      totalSksLulus: totalSks,
      ipk,
      predikatKelulusan,
    };
  }

  static async getExamEligibility(mahasiswaId: number, activePeriodeId: string) {
    const bimb = await db.query.bimbingan.findFirst({
      where: and(eq(bimbingan.mahasiswaId, mahasiswaId), eq(bimbingan.periodeId, activePeriodeId)),
      with: {
        thread: true,
      },
    });

    const hasBimbinganApproved = bimb?.isApproved === true;
    const thread = bimb?.thread || [];
    const utsThreadCount = thread.filter((t) => t.tipe === 'uts').length;
    const uasThreadCount = thread.filter((t) => t.tipe === 'uas').length;

    const utsEligible = hasBimbinganApproved || utsThreadCount >= 1;
    const uasEligible = hasBimbinganApproved || uasThreadCount >= 3;
    const bimbinganEligible = utsEligible && uasEligible;

    const studentKrs = await db
      .select({
        krsId: krs.id,
        kelasKuliahId: krs.kelasKuliahId,
        namaKelas: kelasKuliah.namaKelas,
        mataKuliahNama: mataKuliah.nama,
        mataKuliahKode: mataKuliah.kode,
      })
      .from(krs)
      .innerJoin(kelasKuliah, eq(krs.kelasKuliahId, kelasKuliah.id))
      .innerJoin(mataKuliah, eq(kelasKuliah.mataKuliahId, mataKuliah.id))
      .where(
        and(eq(krs.mahasiswaId, mahasiswaId), eq(kelasKuliah.periodeId, activePeriodeId), eq(krs.isApproved, true)),
      );

    const classIds = studentKrs.map((k) => k.kelasKuliahId);
    const classEligibility = [];

    if (classIds.length > 0) {
      // Fetch all BAP records for these classes
      const allBaps = await db.select().from(bap).where(inArray(bap.kelasKuliahId, classIds));

      // Group BAPs by class ID
      const bapsByClass = new Map<number, (typeof bap.$inferSelect)[]>();
      for (const b of allBaps) {
        const arr = bapsByClass.get(b.kelasKuliahId) || [];
        arr.push(b);
        bapsByClass.set(b.kelasKuliahId, arr);
      }

      // Fetch all presensi records for these BAP records of the student
      const bapIds = allBaps.map((b) => b.id);
      const presentBapIds = new Set<number>();

      if (bapIds.length > 0) {
        const studentPresensi = await db
          .select()
          .from(presensi)
          .where(and(eq(presensi.mahasiswaId, mahasiswaId), inArray(presensi.bapId, bapIds)));

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
            attendance: attendanceEligible
              ? 'Lolos (>= 80%)'
              : `Kehadiran kurang (${attendanceRate.toFixed(1)}% < 80%)`,
            bimbingan: bimbinganEligible ? 'Lolos' : 'Bimbingan PA belum terpenuhi (min. 3 interaksi)',
          },
        });
      }
    }

    const overallEligible = classEligibility.every((c) => c.eligible);

    return {
      mahasiswaId,
      periodeId: activePeriodeId,
      bimbingan: {
        isApproved: bimb?.isApproved || false,
        utsInteractionsCount: utsThreadCount,
        uasInteractionsCount: uasThreadCount,
        utsEligible,
        uasEligible,
        eligible: bimbinganEligible,
      },
      classes: classEligibility,
      overallEligible,
    };
  }

  // --- KONVERSI NILAI ---

  static async getAllKonversi(programStudiId?: number) {
    let whereClause = undefined;
    if (programStudiId !== undefined) {
      whereClause = eq(konversiNilai.programStudiId, programStudiId);
    }
    return await db.query.konversiNilai.findMany({
      where: whereClause,
      with: {
        programStudi: true,
      },
    });
  }

  static async saveKonversi(data: {
    id?: number;
    programStudiId?: number | null;
    nilaiHuruf: string;
    bobotIndeks: string | number;
    nilaiMin: string | number;
    nilaiMax: string | number;
    predikat: string;
  }) {
    const payload = {
      programStudiId: data.programStudiId || null,
      nilaiHuruf: data.nilaiHuruf,
      bobotIndeks: String(data.bobotIndeks),
      nilaiMin: String(data.nilaiMin),
      nilaiMax: String(data.nilaiMax),
      predikat: data.predikat,
    };

    if (data.id) {
      const [updated] = await db.update(konversiNilai).set(payload).where(eq(konversiNilai.id, data.id)).returning();
      return updated;
    } else {
      const [created] = await db.insert(konversiNilai).values(payload).returning();
      return created;
    }
  }

  static async deleteKonversi(id: number) {
    await db.delete(konversiNilai).where(eq(konversiNilai.id, id));
  }

  // --- SKALA PREDIKAT KELULUSAN ---

  static async getAllPredikat() {
    return await db.select().from(skalaPredikatKelulusan);
  }

  static async savePredikat(data: { id?: number; ipkMin: string | number; ipkMax: string | number; predikat: string }) {
    const payload = {
      ipkMin: String(data.ipkMin),
      ipkMax: String(data.ipkMax),
      predikat: data.predikat,
    };

    if (data.id) {
      const [updated] = await db
        .update(skalaPredikatKelulusan)
        .set(payload)
        .where(eq(skalaPredikatKelulusan.id, data.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(skalaPredikatKelulusan).values(payload).returning();
      return created;
    }
  }

  static async deletePredikat(id: number) {
    await db.delete(skalaPredikatKelulusan).where(eq(skalaPredikatKelulusan.id, id));
  }

  // --- REKAP NILAI ---

  static async getRekapNilai(mahasiswaId: number, periodeId?: string) {
    const mhs = await db.query.mahasiswa.findFirst({
      where: eq(mahasiswa.id, mahasiswaId),
      with: { programStudi: true },
    });
    if (!mhs) throw new Error('Mahasiswa tidak ditemukan');

    const whereClause = periodeId
      ? and(eq(krs.mahasiswaId, mahasiswaId), eq(kelasKuliah.periodeId, periodeId))
      : eq(krs.mahasiswaId, mahasiswaId);

    const krsList = await db
      .select({
        krsId: krs.id,
        mataKuliahId: kelasKuliah.mataKuliahId,
        kodeMk: mataKuliah.kode,
        namaMk: mataKuliah.nama,
        sks: mataKuliah.sksTotal,
        nilaiAngka: krs.nilaiAngka,
        nilaiHuruf: krs.nilaiHuruf,
        nilaiIndeks: krs.nilaiIndeks,
        isApproved: krs.isApproved,
      })
      .from(krs)
      .innerJoin(kelasKuliah, eq(krs.kelasKuliahId, kelasKuliah.id))
      .innerJoin(mataKuliah, eq(kelasKuliah.mataKuliahId, mataKuliah.id))
      .where(whereClause);

    let totalSks = 0;
    let totalBobot = 0;
    for (const r of krsList) {
      if (r.nilaiIndeks && r.sks) {
        totalSks += r.sks;
        totalBobot += parseFloat(r.nilaiIndeks) * r.sks;
      }
    }
    const ip = totalSks > 0 ? totalBobot / totalSks : 0;

    return {
      mahasiswa: { id: mhs.id, nim: mhs.nim, nama: mhs.nama, prodi: mhs.programStudi?.nama || '' },
      periode: periodeId ? { id: periodeId } : null,
      mataKuliah: krsList,
      summary: { totalSks, ip: Math.round(ip * 100) / 100, totalMk: krsList.length },
    };
  }

  static async getRekapPerProdi(periodeId?: string) {
    const prodis = await db.select({ id: programStudi.id, nama: programStudi.nama }).from(programStudi);

    const result = [];
    for (const p of prodis) {
      const mhsList = await db.select({ id: mahasiswa.id }).from(mahasiswa).where(eq(mahasiswa.programStudiId, p.id));

      if (mhsList.length === 0) {
        result.push({ prodiId: p.id, prodiNama: p.nama, totalMahasiswa: 0, rataIP: 0 });
        continue;
      }

      const mhsIds = mhsList.map((m) => m.id);
      let totalIpk = 0;
      let mhsWithIpk = 0;

      for (const mhsId of mhsIds) {
        const rs = await db
          .select({ nilaiIndeks: krs.nilaiIndeks, sks: mataKuliah.sksTotal })
          .from(krs)
          .innerJoin(kelasKuliah, eq(krs.kelasKuliahId, kelasKuliah.id))
          .innerJoin(mataKuliah, eq(kelasKuliah.mataKuliahId, mataKuliah.id))
          .where(and(eq(krs.mahasiswaId, mhsId), ...(periodeId ? [eq(kelasKuliah.periodeId, periodeId)] : [])));

        let bobot = 0;
        let sks = 0;
        for (const r of rs) {
          if (r.nilaiIndeks && r.sks) {
            bobot += parseFloat(r.nilaiIndeks) * r.sks;
            sks += r.sks;
          }
        }
        if (sks > 0) {
          totalIpk += bobot / sks;
          mhsWithIpk++;
        }
      }

      result.push({
        prodiId: p.id,
        prodiNama: p.nama,
        totalMahasiswa: mhsList.length,
        rataIP: mhsWithIpk > 0 ? Math.round((totalIpk / mhsWithIpk) * 100) / 100 : 0,
      });
    }

    return { periode: periodeId ? { id: periodeId } : null, prodi: result };
  }
}

import { and, asc, count, desc, eq, ilike, inArray, isNotNull, isNull, or, sql } from 'drizzle-orm';
import {
  bap,
  bimbingan,
  dosen,
  dosenPengajarKelas,
  kelasKuliah,
  komponenNilai,
  konversiNilai,
  krs,
  mahasiswa,
  mataKuliah,
  nilaiKomponenMahasiswa,
  nilaiSubKomponenMahasiswa,
  pengajuanCuti,
  periodeAkademik,
  presensi,
  programStudi,
  skalaPredikatKelulusan,
  subKomponenNilai,
  tagihan,
} from '../models/schema';
import { db } from '../utils/db';
import { computeKomponenScore, type KonversiRule, resolveNilaiEnvelope } from '../utils/grade-calc';
import { PresensiService } from './presensi.service';
import { SystemParameterService } from './system-parameter.service';

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

  /**
   * Rincian nilai per komponen untuk mahasiswa (read-only).
   * Mengembalikan NA + daftar komponen (nama, bobot, nilai L1 agregat).
   * TIDAK pernah menyertakan nilai/definisi sub-komponen.
   */
  static async getRincianKomponen(mahasiswaId: number, kelasKuliahId: number) {
    const [krsRecord] = await db
      .select({
        id: krs.id,
        nilaiAngka: krs.nilaiAngka,
        nilaiHuruf: krs.nilaiHuruf,
        nilaiIndeks: krs.nilaiIndeks,
      })
      .from(krs)
      .where(and(eq(krs.mahasiswaId, mahasiswaId), eq(krs.kelasKuliahId, kelasKuliahId)));

    if (!krsRecord) {
      throw new Error('KRS mahasiswa tidak ditemukan pada kelas ini.');
    }

    const components = await db
      .select({ id: komponenNilai.id, nama: komponenNilai.nama, bobot: komponenNilai.bobot })
      .from(komponenNilai)
      .where(eq(komponenNilai.kelasKuliahId, kelasKuliahId))
      .orderBy(asc(komponenNilai.id));

    const componentIds = components.map((c) => c.id);
    const subDefs =
      componentIds.length > 0
        ? await db
            .select({
              id: subKomponenNilai.id,
              komponenNilaiId: subKomponenNilai.komponenNilaiId,
              bobot: subKomponenNilai.bobot,
            })
            .from(subKomponenNilai)
            .where(inArray(subKomponenNilai.komponenNilaiId, componentIds))
        : [];

    const subDefsByKomponen = new Map<number, Array<{ id: number; bobot: number }>>();
    for (const s of subDefs) {
      const arr = subDefsByKomponen.get(s.komponenNilaiId) ?? [];
      arr.push({ id: s.id, bobot: s.bobot });
      subDefsByKomponen.set(s.komponenNilaiId, arr);
    }

    const directRows = await db
      .select()
      .from(nilaiKomponenMahasiswa)
      .where(eq(nilaiKomponenMahasiswa.krsId, krsRecord.id));
    const subRows = await db
      .select()
      .from(nilaiSubKomponenMahasiswa)
      .where(eq(nilaiSubKomponenMahasiswa.krsId, krsRecord.id));

    const directGrades = new Map(directRows.map((g) => [g.komponenNilaiId, parseFloat(g.nilai)]));
    const subGrades = new Map(subRows.map((g) => [g.subKomponenNilaiId, parseFloat(g.nilai)]));

    const komponen = components.map((c) => {
      const subs = subDefsByKomponen.get(c.id) ?? [];
      let nilai: number | null = null;
      if (subs.length > 0) {
        const direct = directGrades.get(c.id);
        if (direct !== undefined) {
          // Selaras buildFinalScore: override langsung menang atas agregasi sub.
          nilai = direct;
        } else {
          const result = computeKomponenScore(subGrades, subs);
          nilai = result.complete && result.score !== null ? result.score : null;
        }
      } else {
        nilai = directGrades.get(c.id) ?? null;
      }
      return { nama: c.nama, bobot: c.bobot, nilai };
    });

    return {
      krsId: krsRecord.id,
      nilaiAngka: krsRecord.nilaiAngka,
      nilaiHuruf: krsRecord.nilaiHuruf,
      nilaiIndeks: krsRecord.nilaiIndeks,
      komponen,
    };
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
    const nMin = parseFloat(String(data.nilaiMin));
    const nMax = parseFloat(String(data.nilaiMax));

    if (isNaN(nMin) || isNaN(nMax) || nMin >= nMax) {
      throw new Error('Nilai minimum harus lebih kecil dari nilai maksimum.');
    }

    const prodiId = data.programStudiId || null;
    const existingRules = await db.query.konversiNilai.findMany({
      where: prodiId ? eq(konversiNilai.programStudiId, prodiId) : isNull(konversiNilai.programStudiId),
    });

    for (const rule of existingRules) {
      if (data.id && rule.id === data.id) continue;
      const rMin = parseFloat(String(rule.nilaiMin));
      const rMax = parseFloat(String(rule.nilaiMax));
      if (Math.max(nMin, rMin) <= Math.min(nMax, rMax)) {
        throw new Error(
          `Rentang nilai (${nMin} - ${nMax}) beririsan / bertabrakan titik batas dengan nilai ${rule.nilaiHuruf} (${rMin} - ${rMax}).`,
        );
      }
    }

    const payload = {
      programStudiId: prodiId,
      nilaiHuruf: data.nilaiHuruf,
      bobotIndeks: String(data.bobotIndeks),
      nilaiMin: String(nMin),
      nilaiMax: String(nMax),
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

  /**
   * Rekap aturan konversi global + usulan rentang baru saat skala dibagi (mis. 100 -> 10).
   * `targetMax` menentukan skala tujuan (100 atau 10). Usulan dihitung proporsional dari
   * envelope saat ini; admin dapat mengubahnya sebelum konfirmasi massal.
   */
  static async getKonversiRekap(targetMax?: number) {
    const rules = (await db.query.konversiNilai.findMany({
      where: isNull(konversiNilai.programStudiId),
      orderBy: [asc(konversiNilai.nilaiMin)],
    })) as unknown as Array<{
      id: number;
      nilaiHuruf: string;
      bobotIndeks: string;
      nilaiMin: string;
      nilaiMax: string;
      predikat: string;
    }>;

    const envelope = resolveNilaiEnvelope(rules as KonversiRule[]);
    const target = targetMax && targetMax > 0 ? targetMax : envelope.max;
    const ratio = envelope.max > 0 ? target / envelope.max : 1;

    const rekapRules = rules.map((r) => ({
      id: r.id,
      nilaiHuruf: r.nilaiHuruf,
      bobotIndeks: r.bobotIndeks,
      nilaiMin: parseFloat(String(r.nilaiMin)),
      nilaiMax: parseFloat(String(r.nilaiMax)),
      predikat: r.predikat,
      usulanMin: Math.round(parseFloat(String(r.nilaiMin)) * ratio * 100) / 100,
      usulanMax: Math.round(parseFloat(String(r.nilaiMax)) * ratio * 100) / 100,
    }));

    const targetEnvelope = { min: envelope.min * ratio, max: target };
    const outside = await db
      .select({ id: krs.id, nilaiAngka: krs.nilaiAngka, nilaiHuruf: krs.nilaiHuruf })
      .from(krs)
      .where(
        sql`${krs.nilaiAngka} IS NOT NULL AND (CAST(${krs.nilaiAngka} AS NUMERIC) < ${targetEnvelope.min} OR CAST(${krs.nilaiAngka} AS NUMERIC) > ${targetEnvelope.max})`,
      );

    return {
      currentEnvelope: envelope,
      targetMax: target,
      rules: rekapRules,
      jumlahNilaiDiLuarRentang: outside.length,
      contohNilaiDiLuarRentang: outside.slice(0, 50),
    };
  }

  /**
   * Konfirmasi massal perubahan aturan konversi nilai. Setiap baris diproses
   * individual sehingga satu kegagalan tidak membatalkan baris lain.
   */
  static async bulkSaveKonversi(
    rules: Array<{
      id: number;
      nilaiHuruf?: string;
      bobotIndeks?: string | number;
      nilaiMin: string | number;
      nilaiMax: string | number;
      predikat?: string;
    }>,
    updatedBy?: number,
    targetMax?: number,
  ) {
    const results: Array<{ id: number; status: 'updated' | 'failed'; error?: string }> = [];
    let updated = 0;

    for (const row of rules) {
      try {
        const existing = await db.query.konversiNilai.findFirst({ where: eq(konversiNilai.id, row.id) });
        if (!existing) {
          results.push({ id: row.id, status: 'failed', error: 'Aturan tidak ditemukan.' });
          continue;
        }
        const nMin = parseFloat(String(row.nilaiMin));
        const nMax = parseFloat(String(row.nilaiMax));
        if (!Number.isFinite(nMin) || !Number.isFinite(nMax) || nMin >= nMax) {
          results.push({ id: row.id, status: 'failed', error: 'Nilai minimum harus lebih kecil dari maksimum.' });
          continue;
        }
        await db
          .update(konversiNilai)
          .set({
            nilaiHuruf: row.nilaiHuruf ?? existing.nilaiHuruf,
            bobotIndeks: row.bobotIndeks !== undefined ? String(row.bobotIndeks) : existing.bobotIndeks,
            nilaiMin: String(nMin),
            nilaiMax: String(nMax),
            predikat: row.predikat ?? existing.predikat,
          })
          .where(eq(konversiNilai.id, row.id));
        updated += 1;
        results.push({ id: row.id, status: 'updated' });
      } catch (err: unknown) {
        results.push({ id: row.id, status: 'failed', error: err instanceof Error ? err.message : 'Gagal menyimpan.' });
      }
    }

    if (targetMax && targetMax > 0) {
      await SystemParameterService.set('NILAI_SKALA_MAX', String(targetMax), updatedBy);
    }

    return {
      updated,
      failed: results.filter((r) => r.status === 'failed').length,
      results,
    };
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
    const prodiStats = await db
      .select({
        prodiId: programStudi.id,
        prodiNama: programStudi.nama,
        totalMahasiswa: sql<number>`(SELECT COUNT(DISTINCT ${mahasiswa.id}) FROM ${mahasiswa} WHERE ${mahasiswa.programStudiId} = ${programStudi.id})`,
        avgIp: sql<number>`COALESCE((
          SELECT AVG(mhs_gpa.ip) FROM (
            SELECT 
              ${mahasiswa.id} AS mhs_id,
              SUM(CAST(${krs.nilaiIndeks} AS NUMERIC) * ${mataKuliah.sksTotal}) / NULLIF(SUM(${mataKuliah.sksTotal}), 0) AS ip
            FROM ${mahasiswa}
            INNER JOIN ${krs} ON ${krs.mahasiswaId} = ${mahasiswa.id}
            INNER JOIN ${kelasKuliah} ON ${krs.kelasKuliahId} = ${kelasKuliah.id}
            INNER JOIN ${mataKuliah} ON ${kelasKuliah.mataKuliahId} = ${mataKuliah.id}
            WHERE ${mahasiswa.programStudiId} = ${programStudi.id}
              ${periodeId ? sql`AND ${kelasKuliah.periodeId} = ${periodeId}` : sql``}
              AND ${krs.nilaiIndeks} IS NOT NULL
            GROUP BY ${mahasiswa.id}
          ) mhs_gpa
        ), 0)`,
      })
      .from(programStudi)
      .orderBy(programStudi.nama);

    const result = prodiStats.map((p) => ({
      prodiId: p.prodiId,
      prodiNama: p.prodiNama,
      totalMahasiswa: Number(p.totalMahasiswa),
      rataIP: Math.round(Number(p.avgIp) * 100) / 100,
    }));

    return { periode: periodeId ? { id: periodeId } : null, prodi: result };
  }

  static async getMatriksNilaiMataKuliah(options: {
    periodeId?: string;
    prodiId?: number;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const conditions = [];
    if (options.periodeId) {
      conditions.push(eq(kelasKuliah.periodeId, options.periodeId));
    }
    if (options.prodiId) {
      conditions.push(eq(mataKuliah.programStudiId, options.prodiId));
    }
    if (options.search && options.search.trim()) {
      const s = `%${options.search.trim()}%`;
      conditions.push(or(ilike(mataKuliah.kode, s), ilike(mataKuliah.nama, s)));
    }

    const rows = await db
      .select({
        mataKuliahId: mataKuliah.id,
        kodeMk: mataKuliah.kode,
        namaMk: mataKuliah.nama,
        sks: mataKuliah.sksTotal,
        prodiId: mataKuliah.programStudiId,
        prodiNama: programStudi.nama,
        totalPeserta: count(krs.id),
        gradeA: sql<number>`SUM(CASE WHEN ${krs.nilaiHuruf} IN ('A', 'A+', 'A-') THEN 1 ELSE 0 END)`,
        gradeB: sql<number>`SUM(CASE WHEN ${krs.nilaiHuruf} IN ('B', 'B+', 'B-') THEN 1 ELSE 0 END)`,
        gradeC: sql<number>`SUM(CASE WHEN ${krs.nilaiHuruf} IN ('C', 'C+', 'C-') THEN 1 ELSE 0 END)`,
        gradeD: sql<number>`SUM(CASE WHEN ${krs.nilaiHuruf} IN ('D', 'D+', 'D-') THEN 1 ELSE 0 END)`,
        gradeE: sql<number>`SUM(CASE WHEN ${krs.nilaiHuruf} = 'E' THEN 1 ELSE 0 END)`,
        gradeNull: sql<number>`SUM(CASE WHEN ${krs.nilaiHuruf} IS NULL OR ${krs.nilaiHuruf} = '' THEN 1 ELSE 0 END)`,
      })
      .from(mataKuliah)
      .leftJoin(programStudi, eq(mataKuliah.programStudiId, programStudi.id))
      .innerJoin(kelasKuliah, eq(kelasKuliah.mataKuliahId, mataKuliah.id))
      .innerJoin(krs, eq(krs.kelasKuliahId, kelasKuliah.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(
        mataKuliah.id,
        mataKuliah.kode,
        mataKuliah.nama,
        mataKuliah.sksTotal,
        mataKuliah.programStudiId,
        programStudi.nama,
      )
      .orderBy(mataKuliah.kode);

    const data = rows.map((r) => {
      const total = Number(r.totalPeserta);
      const gradeA = Number(r.gradeA);
      const gradeB = Number(r.gradeB);
      const gradeC = Number(r.gradeC);
      const gradeD = Number(r.gradeD);
      const gradeE = Number(r.gradeE);
      const gradeNull = Number(r.gradeNull);
      const lulus = gradeA + gradeB + gradeC + gradeD;
      const persenLulus = total > 0 ? Math.round((lulus / total) * 100) : 0;

      return {
        mataKuliahId: r.mataKuliahId,
        kodeMk: r.kodeMk,
        namaMk: r.namaMk,
        sks: r.sks,
        prodiId: r.prodiId,
        prodiNama: r.prodiNama || '-',
        totalPeserta: total,
        gradeA,
        gradeB,
        gradeC,
        gradeD,
        gradeE,
        gradeNull,
        persenLulus,
      };
    });

    if (options.page && options.limit) {
      const page = options.page;
      const limit = options.limit;
      const total = data.length;
      const offset = (page - 1) * limit;
      const paginatedData = data.slice(offset, offset + limit);

      return {
        data: paginatedData,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    }

    return data;
  }

  static async getDetailNilaiMataKuliah(mataKuliahId: number, periodeId?: string) {
    const mk = await db.query.mataKuliah.findFirst({
      where: eq(mataKuliah.id, mataKuliahId),
      with: { programStudi: true },
    });
    if (!mk) throw new Error('Mata kuliah tidak ditemukan');

    const kelasConditions = [eq(kelasKuliah.mataKuliahId, mataKuliahId)];
    if (periodeId) kelasConditions.push(eq(kelasKuliah.periodeId, periodeId));

    const kelasList = await db
      .select({
        id: kelasKuliah.id,
        namaKelas: kelasKuliah.namaKelas,
        periodeId: kelasKuliah.periodeId,
      })
      .from(kelasKuliah)
      .where(and(...kelasConditions));

    const kelasIds = kelasList.map((k) => k.id);
    const mkData = {
      id: mk.id,
      kode: mk.kode,
      nama: mk.nama,
      sksTotal: mk.sksTotal,
      prodiNama: mk.programStudi?.nama || '-',
    };

    if (kelasIds.length === 0) {
      return {
        mataKuliah: mkData,
        dosenPengajar: [],
        dosenPengampu: [],
        mahasiswa: [],
        peserta: [],
        bapList: [],
      };
    }

    const dosenList = await db
      .select({
        dosenId: dosen.id,
        nama: dosen.nama,
        nip: dosen.nip,
      })
      .from(dosenPengajarKelas)
      .leftJoin(dosen, eq(dosenPengajarKelas.dosenId, dosen.id))
      .where(inArray(dosenPengajarKelas.kelasKuliahId, kelasIds));

    const mhsList = await db
      .select({
        krsId: krs.id,
        mahasiswaId: mahasiswa.id,
        nim: mahasiswa.nim,
        nama: mahasiswa.nama,
        foto: mahasiswa.foto,
        namaKelas: kelasKuliah.namaKelas,
        nilaiAngka: krs.nilaiAngka,
        nilaiHuruf: krs.nilaiHuruf,
        nilaiIndeks: krs.nilaiIndeks,
        isApproved: krs.isApproved,
      })
      .from(krs)
      .innerJoin(mahasiswa, eq(krs.mahasiswaId, mahasiswa.id))
      .innerJoin(kelasKuliah, eq(krs.kelasKuliahId, kelasKuliah.id))
      .where(inArray(krs.kelasKuliahId, kelasIds))
      .orderBy(mahasiswa.nim);

    const bapRows = await db
      .select({
        id: bap.id,
        kelasKuliahId: bap.kelasKuliahId,
        pertemuanKe: bap.pertemuanKe,
        tanggal: bap.tanggal,
        materi: bap.materi,
        tema: bap.tema,
        durasiMenit: bap.durasiMenit,
        dosenNama: dosen.nama,
      })
      .from(bap)
      .leftJoin(dosen, eq(bap.dosenId, dosen.id))
      .where(inArray(bap.kelasKuliahId, kelasIds))
      .orderBy(bap.pertemuanKe);

    const dosenPengampu = Array.from(new Set(dosenList.map((d) => d.nama).filter((n): n is string => Boolean(n))));

    return {
      mataKuliah: mkData,
      dosenPengajar: dosenList,
      dosenPengampu,
      mahasiswa: mhsList,
      peserta: mhsList,
      bapList: bapRows,
    };
  }

  static async getPeriodeList(mahasiswaId: number) {
    const rows = await db
      .select({
        id: periodeAkademik.id,
        nama: periodeAkademik.nama,
        aktif: periodeAkademik.aktif,
      })
      .from(krs)
      .innerJoin(kelasKuliah, eq(krs.kelasKuliahId, kelasKuliah.id))
      .innerJoin(periodeAkademik, eq(kelasKuliah.periodeId, periodeAkademik.id))
      .where(eq(krs.mahasiswaId, mahasiswaId))
      .orderBy(desc(periodeAkademik.id));

    const unique = new Map<string, { id: string; nama: string; aktif: boolean }>();
    for (const r of rows) {
      if (!unique.has(r.id)) unique.set(r.id, r);
    }
    return { data: Array.from(unique.values()) };
  }

  /**
   * Menghitung nomor semester aktif mahasiswa pada periode tertentu, independen
   * dari kelengkapan KRS. Berbasis angkatan (tahun masuk) + periode berjalan,
   * dikurangi jumlah semester cuti yang sudah diambil sebelum periode ini.
   * Periode ID berformat "YYYYT" (T = 1 Ganjil, 2 Genap).
   */
  static async hitungSemester(mahasiswaId: number, periodeId: string): Promise<number | null> {
    const [mhs] = await db
      .select({ angkatan: mahasiswa.angkatan })
      .from(mahasiswa)
      .where(eq(mahasiswa.id, mahasiswaId));
    if (!mhs?.angkatan) return null;

    const angkatanTahun = parseInt(mhs.angkatan, 10);
    if (isNaN(angkatanTahun)) return null;

    const periodeTahun = parseInt(periodeId.slice(0, 4), 10);
    const term = parseInt(periodeId.slice(4, 5), 10) || 1;
    if (isNaN(periodeTahun)) return null;

    // Semester kalender tanpa memperhitungkan cuti.
    let semester = (periodeTahun - angkatanTahun) * 2 + term;

    // Kurangi semester cuti yang sudah dilalui sebelum periode ini.
    const cutis = await db
      .select({ mulai: pengajuanCuti.semesterMulaiCuti, berakhir: pengajuanCuti.semesterBerakhirCuti })
      .from(pengajuanCuti)
      .where(
        and(
          eq(pengajuanCuti.mahasiswaId, mahasiswaId),
          inArray(pengajuanCuti.status, ['disetujui_pa', 'disetujui_keuangan', 'disetujui_prodi', 'kembali_aktif']),
        ),
      );

    const currentIdx = periodeTahun * 2 + term;
    const idxOf = (pid: string | null) => {
      if (!pid || pid.length < 5) return null;
      const t = parseInt(pid.slice(0, 4), 10);
      const tr = parseInt(pid.slice(4, 5), 10) || 1;
      if (isNaN(t)) return null;
      return t * 2 + tr;
    };

    for (const c of cutis) {
      const mulaiIdx = idxOf(c.mulai);
      const berakhirIdx = idxOf(c.berakhir);
      // Periode cuti dihitung sebagai rentang [mulai..berakhir] yang jatuh
      // sebelum atau sama dengan periode berjalan; tiap semester cuti
      // menggeser kemajuan 1 semester.
      const lo = mulaiIdx ?? berakhirIdx ?? null;
      const hi = berakhirIdx ?? mulaiIdx ?? null;
      if (lo === null || hi === null) continue;
      const from = Math.min(lo, hi);
      const to = Math.max(lo, hi);
      if (from > currentIdx) continue; // cuti belum terjadi
      semester -= Math.min(to, currentIdx) - from + 1;
    }

    return Math.max(1, semester);
  }
}

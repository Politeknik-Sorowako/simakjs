import { and, eq, inArray } from 'drizzle-orm';
import {
  bahanKajian,
  bahanKajianCpl,
  capaianCpl,
  capaianCpmk,
  cpl,
  cplMataKuliah,
  cplProfilLulusan,
  cpmk,
  cpmkCpl,
  evaluasiKurikulum,
  kurikulum,
  kurikulumMataKuliah,
  mataKuliah,
  mataKuliahBahanKajian,
  profilLulusan,
  programStudi,
  subCpmk,
} from '../models/schema';
import { db } from '../utils/db';

export class ObeReportService {
  static async getCplCpmkCoverage(kurikulumId: number) {
    const kur = await db.query.kurikulum.findFirst({
      where: eq(kurikulum.id, kurikulumId),
    });
    if (!kur) throw new Error('Kurikulum tidak ditemukan');

    const allCpl = await db.query.cpl.findMany({
      where: eq(cpl.programStudiId, kur.programStudiId),
    });

    const mkInKurikulum = await db.query.kurikulumMataKuliah.findMany({
      where: eq(kurikulumMataKuliah.kurikulumId, kurikulumId),
    });
    const mkIds = mkInKurikulum.map((kmk) => kmk.mataKuliahId);

    const cpmkInKurikulum = await db.query.cpmk.findMany({
      where: inArray(cpmk.mataKuliahId, mkIds),
    });
    const cpmkIdsInKurikulum = new Set(cpmkInKurikulum.map((c) => c.id));

    const allCpmkCplMappings = await db.query.cpmkCpl.findMany();

    const cplWithCpmk = new Set<number>();
    const cpmkCountPerCpl = new Map<number, number>();

    for (const mapping of allCpmkCplMappings) {
      if (cpmkIdsInKurikulum.has(mapping.cpmkId)) {
        cplWithCpmk.add(mapping.cplId);
        cpmkCountPerCpl.set(mapping.cplId, (cpmkCountPerCpl.get(mapping.cplId) || 0) + 1);
      }
    }

    const coverage = allCpl.map((c) => ({
      cpl: { id: c.id, kode: c.kode, deskripsi: c.deskripsi },
      hasCpmk: cplWithCpmk.has(c.id),
      cpmkCount: cpmkCountPerCpl.get(c.id) || 0,
    }));

    const coveredCount = coverage.filter((c) => c.hasCpmk).length;
    const uncovered = coverage.filter((c) => !c.hasCpmk);

    return {
      kurikulum: { id: kur.id, kode: kur.kode, nama: kur.nama },
      totalCpl: allCpl.length,
      coveredCpl: coveredCount,
      uncoveredCpl: uncovered.length,
      coveragePercent: allCpl.length > 0 ? (coveredCount / allCpl.length) * 100 : 0,
      uncovered: uncovered.map((c) => c.cpl),
    };
  }

  static async getBkMkCoverage(kurikulumId: number) {
    const kur = await db.query.kurikulum.findFirst({
      where: eq(kurikulum.id, kurikulumId),
    });
    if (!kur) throw new Error('Kurikulum tidak ditemukan');

    const allBk = await db.query.bahanKajian.findMany({
      where: eq(bahanKajian.programStudiId, kur.programStudiId),
    });

    const mkInKurikulum = await db.query.kurikulumMataKuliah.findMany({
      where: eq(kurikulumMataKuliah.kurikulumId, kurikulumId),
    });
    const mkIds = mkInKurikulum.map((kmk) => kmk.mataKuliahId);

    const mkIdsSet = new Set(mkIds);
    const allMkBkMappings = await db.query.mataKuliahBahanKajian.findMany();

    const bkWithMk = new Set<number>();
    for (const mapping of allMkBkMappings) {
      if (mkIdsSet.has(mapping.mataKuliahId)) {
        bkWithMk.add(mapping.bahanKajianId);
      }
    }

    const coverage = allBk.map((bk) => ({
      bk: { id: bk.id, kode: bk.kode, nama: bk.nama },
      hasMk: bkWithMk.has(bk.id),
    }));

    const coveredCount = coverage.filter((c) => c.hasMk).length;
    const uncovered = coverage.filter((c) => !c.hasMk);

    return {
      kurikulum: { id: kur.id, kode: kur.kode, nama: kur.nama },
      totalBk: allBk.length,
      coveredBk: coveredCount,
      uncoveredBk: uncovered.length,
      coveragePercent: allBk.length > 0 ? (coveredCount / allBk.length) * 100 : 0,
      uncovered: uncovered.map((c) => c.bk),
    };
  }

  static async getObeSummary(prodiId: number) {
    const prodi = await db.query.programStudi.findFirst({
      where: eq(programStudi.id, prodiId),
    });
    if (!prodi) throw new Error('Program Studi tidak ditemukan');

    const totalPl = await db.query.profilLulusan.findMany({
      where: eq(profilLulusan.programStudiId, prodiId),
    });

    const totalCpl = await db.query.cpl.findMany({
      where: eq(cpl.programStudiId, prodiId),
    });

    const totalBk = await db.query.bahanKajian.findMany({
      where: eq(bahanKajian.programStudiId, prodiId),
    });

    const cplIds = totalCpl.map((c) => c.id);
    const bkIds = totalBk.map((bk) => bk.id);

    let plCplMappingsCount = 0;
    let bkCplMappingsCount = 0;

    if (cplIds.length > 0) {
      const plCplMappings = await db.query.cplProfilLulusan.findMany({
        where: inArray(cplProfilLulusan.cplId, cplIds),
      });
      plCplMappingsCount = plCplMappings.length;
    }

    if (bkIds.length > 0) {
      const bkCplMappings = await db.query.bahanKajianCpl.findMany({
        where: inArray(bahanKajianCpl.bahanKajianId, bkIds),
      });
      bkCplMappingsCount = bkCplMappings.length;
    }

    return {
      programStudi: { id: prodi.id, kode: prodi.kode, nama: prodi.nama },
      profilLulusan: totalPl.length,
      cpl: totalCpl.length,
      bahanKajian: totalBk.length,
      plCplMappings: plCplMappingsCount,
      bkCplMappings: bkCplMappingsCount,
    };
  }

  static async getCpmkAchievement(kelasKuliahId: number) {
    const capaian = await db.query.capaianCpmk.findMany({
      where: eq(capaianCpmk.kelasKuliahId, kelasKuliahId),
      with: {
        cpmk: {
          columns: { id: true, kode: true, deskripsi: true },
          with: { mataKuliah: { columns: { id: true, kode: true, nama: true } } },
        },
        mahasiswa: { columns: { id: true, nim: true, nama: true } },
      },
    });

    const cpmkMap = new Map<number, { cpmk: any; mataKuliah: any; scores: number[] }>();
    for (const c of capaian) {
      const key = c.cpmkId;
      if (!cpmkMap.has(key)) {
        cpmkMap.set(key, { cpmk: c.cpmk, mataKuliah: c.cpmk.mataKuliah, scores: [] });
      }
      cpmkMap.get(key)!.scores.push(parseFloat(c.nilai));
    }

    const rekap = [];
    for (const [cpmkId, data] of cpmkMap) {
      const avg = data.scores.reduce((s, v) => s + v, 0) / data.scores.length;
      rekap.push({
        cpmkId,
        kode: data.cpmk.kode,
        deskripsi: data.cpmk.deskripsi,
        mataKuliah: data.mataKuliah,
        rataRata: parseFloat(avg.toFixed(2)),
        min: Math.min(...data.scores),
        max: Math.max(...data.scores),
        jumlahMahasiswa: data.scores.length,
      });
    }

    return rekap;
  }

  static async getCplAchievement(kurikulumId?: number, periodeId?: string) {
    const conditions = [];
    if (kurikulumId) conditions.push(eq(capaianCpl.kurikulumId, kurikulumId));
    if (periodeId) conditions.push(eq(capaianCpl.periodeId, periodeId));

    const capaian = await db.query.capaianCpl.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        cpl: { columns: { id: true, kode: true, deskripsi: true } },
      },
    });

    const cplMap = new Map<number, { cpl: any; scores: number[] }>();
    for (const c of capaian) {
      const key = c.cplId;
      if (!cplMap.has(key)) {
        cplMap.set(key, { cpl: c.cpl, scores: [] });
      }
      cplMap.get(key)!.scores.push(parseFloat(c.nilai));
    }

    const rekap = [];
    for (const [cplId, data] of cplMap) {
      const avg = data.scores.reduce((s, v) => s + v, 0) / data.scores.length;
      const predikat = avg >= 85 ? 'SB' : avg >= 70 ? 'B' : avg >= 55 ? 'C' : avg >= 40 ? 'K' : 'SK';
      rekap.push({
        cplId,
        kode: data.cpl.kode,
        deskripsi: data.cpl.deskripsi,
        rataRata: parseFloat(avg.toFixed(2)),
        predikat,
        min: Math.min(...data.scores),
        max: Math.max(...data.scores),
        jumlahMahasiswa: data.scores.length,
      });
    }

    return rekap;
  }

  static async getEvaluasiRekap(kurikulumId: number) {
    const evaluasi = await db.query.evaluasiKurikulum.findMany({
      where: eq(evaluasiKurikulum.kurikulumId, kurikulumId),
      orderBy: (e, { desc }) => [desc(e.createdAt)],
      with: {
        periode: { columns: { id: true, nama: true } },
      },
    });

    const statusCount = { open: 0, in_progress: 0, closed: 0 };
    for (const e of evaluasi) {
      if (e.status && e.status in statusCount) {
        statusCount[e.status as keyof typeof statusCount]++;
      }
    }

    return {
      total: evaluasi.length,
      statusCount,
      evaluasi,
    };
  }
}

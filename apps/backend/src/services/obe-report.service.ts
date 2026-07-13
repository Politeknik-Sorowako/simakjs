import { and, eq, inArray } from 'drizzle-orm';
import {
  bahanKajian,
  bahanKajianCpl,
  cpl,
  cplProfilLulusan,
  cpmk,
  cpmkCpl,
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

    const cplWithCpmk = new Set<number>();
    for (const mapping of await db.query.cpmkCpl.findMany()) {
      if (cpmkInKurikulum.some((c) => c.id === mapping.cpmkId)) {
        cplWithCpmk.add(mapping.cplId);
      }
    }

    const coverage = allCpl.map((c) => ({
      cpl: { id: c.id, kode: c.kode, deskripsi: c.deskripsi },
      hasCpmk: cplWithCpmk.has(c.id),
      cpmkCount: cpmkInKurikulum.filter((cpmkItem) => Array.from(cplWithCpmk).some((cplId) => cplId === c.id)).length,
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

    const bkWithMk = new Set<number>();
    for (const mapping of await db.query.mataKuliahBahanKajian.findMany()) {
      if (mkIds.includes(mapping.mataKuliahId)) {
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

    const plCplMappings = await db.query.cplProfilLulusan.findMany();
    const bkCplMappings = await db.query.bahanKajianCpl.findMany();

    return {
      programStudi: { id: prodi.id, kode: prodi.kode, nama: prodi.nama },
      profilLulusan: totalPl.length,
      cpl: totalCpl.length,
      bahanKajian: totalBk.length,
      plCplMappings: plCplMappings.length,
      bkCplMappings: bkCplMappings.length,
    };
  }
}

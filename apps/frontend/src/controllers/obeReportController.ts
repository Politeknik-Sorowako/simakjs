import { fetchApi } from '../utils/api';
import { eden, unwrap } from '../utils/eden';

export interface ObeSummary {
  programStudi: { id: number; kode: string; nama: string };
  profilLulusan: number;
  cpl: number;
  bahanKajian: number;
  plCplMappings: number;
  bkCplMappings: number;
}

export interface CplCpmkCoverage {
  kurikulum: { id: number; kode: string; nama: string };
  totalCpl: number;
  coveredCpl: number;
  uncoveredCpl: number;
  coveragePercent: number;
  uncovered: { id: number; kode: string; deskripsi: string }[];
}

export interface BkMkCoverage {
  kurikulum: { id: number; kode: string; nama: string };
  totalBk: number;
  coveredBk: number;
  uncoveredBk: number;
  coveragePercent: number;
  uncovered: { id: number; kode: string; nama: string }[];
}

export interface CpmkAchievement {
  cpmkId: number;
  kode: string;
  deskripsi: string;
  mataKuliah: { id: number; kode: string; nama: string };
  rataRata: number;
  min: number;
  max: number;
  jumlahMahasiswa: number;
}

export interface CplAchievement {
  cplId: number;
  kode: string;
  deskripsi: string;
  rataRata: number;
  predikat: string;
  min: number;
  max: number;
  jumlahMahasiswa: number;
}

export interface EvaluasiRekap {
  total: number;
  statusCount: { open: number; in_progress: number; closed: number };
  evaluasi: Record<string, unknown>[];
}

export const obeReportController = {
  async getSummary(prodiId: number): Promise<ObeSummary> {
    return unwrap<ObeSummary>(
      eden['laporan-obe'].summary.get({ $query: { prodiId } }) as unknown as Promise<{
        data?: ObeSummary;
        error?: unknown;
      }>,
    );
  },

  async getCplCpmkCoverage(kurikulumId: number): Promise<CplCpmkCoverage> {
    return unwrap<CplCpmkCoverage>(
      eden['laporan-obe']['cpl-cpmk-coverage'].get({
        $query: { kurikulumId },
      }) as unknown as Promise<{ data?: CplCpmkCoverage; error?: unknown }>,
    );
  },

  async getBkMkCoverage(kurikulumId: number): Promise<BkMkCoverage> {
    return unwrap<BkMkCoverage>(
      eden['laporan-obe']['bk-mk-coverage'].get({
        $query: { kurikulumId },
      }) as unknown as Promise<{ data?: BkMkCoverage; error?: unknown }>,
    );
  },

  async getCpmkAchievement(kelasKuliahId: number): Promise<CpmkAchievement[]> {
    return fetchApi<CpmkAchievement[]>(`/laporan-obe/cpmk-achievement/${kelasKuliahId}`);
  },

  async getCplAchievement(params?: { kurikulumId?: number; periodeId?: string }): Promise<CplAchievement[]> {
    const query: Record<string, string> = {};
    if (params?.kurikulumId) query.kurikulumId = String(params.kurikulumId);
    if (params?.periodeId) query.periodeId = params.periodeId;
    return unwrap<CplAchievement[]>(
      eden['laporan-obe']['cpl-achievement'].get({
        $query: query,
      }) as unknown as Promise<{ data?: CplAchievement[]; error?: unknown }>,
    );
  },

  async getEvaluasiRekap(kurikulumId: number): Promise<EvaluasiRekap> {
    return fetchApi<EvaluasiRekap>(`/laporan-obe/evaluasi-rekap/${kurikulumId}`);
  },
};

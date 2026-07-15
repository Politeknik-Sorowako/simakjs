import { fetchApi } from '../utils/api';

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
  evaluasi: any[];
}

export const obeReportController = {
  async getSummary(prodiId: number): Promise<ObeSummary> {
    return fetchApi<ObeSummary>(`/laporan-obe/summary?prodiId=${prodiId}`);
  },

  async getCplCpmkCoverage(kurikulumId: number): Promise<CplCpmkCoverage> {
    return fetchApi<CplCpmkCoverage>(`/laporan-obe/cpl-cpmk-coverage?kurikulumId=${kurikulumId}`);
  },

  async getBkMkCoverage(kurikulumId: number): Promise<BkMkCoverage> {
    return fetchApi<BkMkCoverage>(`/laporan-obe/bk-mk-coverage?kurikulumId=${kurikulumId}`);
  },

  async getCpmkAchievement(kelasKuliahId: number): Promise<CpmkAchievement[]> {
    return fetchApi<CpmkAchievement[]>(`/laporan-obe/cpmk-achievement/${kelasKuliahId}`);
  },

  async getCplAchievement(params?: { kurikulumId?: number; periodeId?: string }): Promise<CplAchievement[]> {
    const qs = new URLSearchParams();
    if (params?.kurikulumId) qs.set('kurikulumId', String(params.kurikulumId));
    if (params?.periodeId) qs.set('periodeId', params.periodeId);
    const query = qs.toString();
    return fetchApi<CplAchievement[]>(`/laporan-obe/cpl-achievement${query ? '?' + query : ''}`);
  },

  async getEvaluasiRekap(kurikulumId: number): Promise<EvaluasiRekap> {
    return fetchApi<EvaluasiRekap>(`/laporan-obe/evaluasi-rekap/${kurikulumId}`);
  },
};

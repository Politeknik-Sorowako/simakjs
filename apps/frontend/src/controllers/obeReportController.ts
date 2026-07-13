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
};

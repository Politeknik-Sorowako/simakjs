import { fetchApi } from '../utils/api';
import { CPMK } from './presensiController';

export interface RpsTopik {
  id: number;
  rpsId: number;
  pertemuanKe: number;
  topik: string;
  subTopik?: string | null;
  metode?: string | null;
  cpmkId?: number | null;
  cpmk?: CPMK | null;
  idPddikti?: string | null;
}

export interface Rps {
  id: number;
  mataKuliahId: number;
  periodeId: string;
  deskripsi?: string | null;
  cplProdi?: string | null;
  topik?: RpsTopik[];
}

export interface RencanaEvaluasi {
  id: number;
  mataKuliahId: number;
  namaEvaluasi: string;
  bobotEvaluasi: number;
  deskripsi?: string | null;
  idPddikti?: string | null;
}

export interface RpsSource {
  id: number;
  mataKuliahId: number;
  kodeMataKuliah: string;
  namaMataKuliah: string;
  prodiNama: string | null;
  prodiId: number | null;
  periodeId: string;
  periodeNama: string | null;
  jumlahTopik: number;
  deskripsi?: string | null;
}

export const rpsController = {
  async getRps(mataKuliahId: number, periodeId: string): Promise<Rps | null> {
    return fetchApi<Rps | null>(`/rps?mataKuliahId=${mataKuliahId}&periodeId=${periodeId}`);
  },

  async createRps(data: Omit<Rps, 'id'>): Promise<Rps> {
    return fetchApi<Rps>('/rps', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateRps(id: number, data: Partial<Omit<Rps, 'id'>>): Promise<Rps> {
    return fetchApi<Rps>(`/rps/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async addTopik(rpsId: number, data: Omit<RpsTopik, 'id' | 'rpsId'>): Promise<RpsTopik> {
    return fetchApi<RpsTopik>(`/rps/${rpsId}/topik`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateTopik(topikId: number, data: Partial<Omit<RpsTopik, 'id' | 'rpsId'>>): Promise<RpsTopik> {
    return fetchApi<RpsTopik>(`/rps/topik/${topikId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteTopik(topikId: number): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/rps/topik/${topikId}`, {
      method: 'DELETE',
    });
  },

  async getRencanaEvaluasi(mataKuliahId: number): Promise<RencanaEvaluasi[]> {
    return fetchApi<RencanaEvaluasi[]>(`/rencana-evaluasi?mataKuliahId=${mataKuliahId}`);
  },

  async createRencanaEvaluasi(data: Omit<RencanaEvaluasi, 'id'>): Promise<RencanaEvaluasi> {
    return fetchApi<RencanaEvaluasi>('/rencana-evaluasi', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateRencanaEvaluasi(id: number, data: Partial<Omit<RencanaEvaluasi, 'id'>>): Promise<RencanaEvaluasi> {
    return fetchApi<RencanaEvaluasi>(`/rencana-evaluasi/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteRencanaEvaluasi(id: number): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/rencana-evaluasi/${id}`, {
      method: 'DELETE',
    });
  },

  async getRpsBySource(sourceRpsId: number): Promise<Rps> {
    return fetchApi<Rps>(`/rps/${sourceRpsId}`);
  },

  async copyRps(
    sourceRpsId: number,
    targetPeriodeId: string,
    targetMataKuliahId: number,
    options?: { copyCpmk?: boolean; copyRencanaEvaluasi?: boolean },
  ): Promise<Rps> {
    return fetchApi<Rps>('/rps/copy', {
      method: 'POST',
      body: JSON.stringify({
        sourceRpsId,
        targetPeriodeId,
        targetMataKuliahId,
        copyCpmk: options?.copyCpmk ?? true,
        copyRencanaEvaluasi: options?.copyRencanaEvaluasi ?? true,
      }),
    });
  },

  async getAvailableSources(params?: { search?: string; prodiId?: number; periodeId?: string }): Promise<RpsSource[]> {
    const sp = new URLSearchParams();
    if (params?.search) sp.append('search', params.search);
    if (params?.prodiId) sp.append('prodiId', String(params.prodiId));
    if (params?.periodeId) sp.append('periodeId', params.periodeId);
    const qs = sp.toString() ? `?${sp.toString()}` : '';
    return fetchApi<RpsSource[]>(`/rps/available-sources${qs}`);
  },

  async bulkGenerate(
    kurikulumId: number,
    semester: number,
    periodeId: string,
  ): Promise<{
    message: string;
    created: { id: number; mataKuliahId: number; nama: string }[];
    skipped: { mataKuliahId: number; nama: string; reason: string }[];
  }> {
    return fetchApi('/rps/bulk-generate', {
      method: 'POST',
      body: JSON.stringify({ kurikulumId, semester, periodeId }),
    });
  },
};

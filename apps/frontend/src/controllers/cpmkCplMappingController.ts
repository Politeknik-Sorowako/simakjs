import { fetchApi } from '../utils/api';
import { Cpl } from './cplController';

export interface CpmkCplMapping {
  id: number;
  cpmkId: number;
  cplId: number;
  bobot: string | null;
  cpmk?: { id: number; kode: string; deskripsi: string; mataKuliah?: { id: number; kode: string; nama: string } };
  cpl?: Cpl;
}

export interface CpmkCplMatriksResponse {
  cpl: Cpl[];
  mataKuliahCpmk: {
    id: number;
    kode: string;
    deskripsi: string;
    mataKuliah?: { id: number; kode: string; nama: string };
  }[];
  matriks: {
    cpl: { id: number; kode: string; deskripsi: string };
    totalBobot: number;
    cpmkMappings: {
      cpmkId: number;
      kode: string;
      deskripsi: string;
      mataKuliah: { id: number; kode: string; nama: string } | null;
      bobot: number | null;
      bobotNormalisasi: number;
    }[];
  }[];
}

export const cpmkCplMappingController = {
  async getAll(cpmkId?: number, cplId?: number): Promise<CpmkCplMapping[]> {
    const params = new URLSearchParams();
    if (cpmkId) params.append('cpmkId', String(cpmkId));
    if (cplId) params.append('cplId', String(cplId));
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return fetchApi<CpmkCplMapping[]>(`/cpmk-cpl-mapping${queryString}`);
  },

  async create(data: { cpmkId: number; cplId: number; bobot?: number | null }): Promise<CpmkCplMapping> {
    return fetchApi<CpmkCplMapping>('/cpmk-cpl-mapping', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async delete(id: number): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/cpmk-cpl-mapping/${id}`, {
      method: 'DELETE',
    });
  },

  async getMatriks(kurikulumId: number): Promise<CpmkCplMatriksResponse> {
    return fetchApi<CpmkCplMatriksResponse>(`/cpmk-cpl-mapping/matriks?kurikulumId=${kurikulumId}`);
  },
};

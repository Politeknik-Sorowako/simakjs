import { fetchApi } from '../utils/api';
import { PaginatedResponse } from './prodiController';

export interface SubCpmk {
  id: number;
  cpmkId: number;
  kode: string;
  deskripsi: string;
  urutan: number;
}

export interface CpmkCplMapping {
  id: number;
  cpmkId: number;
  cplId: number;
  bobot: string | null;
  cpl?: { id: number; kode: string; deskripsi: string };
}

export interface Cpmk {
  id: number;
  mataKuliahId: number;
  kurikulumMataKuliahId: number | null;
  kode: string;
  deskripsi: string;
  mataKuliah?: { id: number; kode: string; nama: string };
  subCpmk?: SubCpmk[];
  cplMappings?: CpmkCplMapping[];
}

export const cpmkController = {
  async getAll(
    search?: string,
    page?: number,
    limit?: number,
    kurikulumId?: number,
    mataKuliahId?: number,
  ): Promise<PaginatedResponse<Cpmk>> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (page) params.append('page', String(page));
    if (limit) params.append('limit', String(limit));
    if (kurikulumId) params.append('kurikulumId', String(kurikulumId));
    if (mataKuliahId) params.append('mataKuliahId', String(mataKuliahId));
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return fetchApi<PaginatedResponse<Cpmk>>(`/cpmk${queryString}`);
  },

  async getByMataKuliah(mataKuliahId: number): Promise<Cpmk[]> {
    return fetchApi<Cpmk[]>(`/cpmk/mata-kuliah/${mataKuliahId}`);
  },

  async getById(id: number): Promise<Cpmk> {
    return fetchApi<Cpmk>(`/cpmk/${id}`);
  },

  async create(data: {
    mataKuliahId: number;
    kurikulumMataKuliahId?: number | null;
    kode: string;
    deskripsi: string;
  }): Promise<Cpmk> {
    return fetchApi<Cpmk>('/cpmk', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(
    id: number,
    data: { kode?: string; deskripsi?: string; kurikulumMataKuliahId?: number | null },
  ): Promise<Cpmk> {
    return fetchApi<Cpmk>(`/cpmk/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: number): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/cpmk/${id}`, {
      method: 'DELETE',
    });
  },
};

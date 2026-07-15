import { fetchApi } from '../utils/api';
import { Dosen } from './dosenController';
import { KelasKuliah } from './kelasKuliahController';
import { PaginatedResponse } from './prodiController';

export interface DosenPengajar {
  id: number;
  dosenId: number;
  kelasKuliahId: number;
  sksBebanMengajar?: number | null;
  idPddikti?: string | null;
  isSynced?: boolean;
  dosen?: Dosen | null;
  kelasKuliah?: KelasKuliah | null;
}

export const dosenPengajarController = {
  async getAll(
    kelasKuliahId?: number,
    dosenId?: number,
    page?: number,
    limit?: number,
  ): Promise<PaginatedResponse<DosenPengajar>> {
    const params = new URLSearchParams();
    if (kelasKuliahId) params.append('kelasKuliahId', String(kelasKuliahId));
    if (dosenId) params.append('dosenId', String(dosenId));
    if (page) params.append('page', String(page));
    if (limit) params.append('limit', String(limit));
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return fetchApi<PaginatedResponse<DosenPengajar>>(`/dosen-pengajar${queryString}`);
  },

  async create(data: { dosenId: number; kelasKuliahId: number; sksBebanMengajar?: number }): Promise<DosenPengajar> {
    return fetchApi<DosenPengajar>('/dosen-pengajar', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async delete(id: number): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/dosen-pengajar/${id}`, {
      method: 'DELETE',
    });
  },
};

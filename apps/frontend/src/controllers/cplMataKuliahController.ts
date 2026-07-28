import { fetchApi } from '../utils/api';

export interface CplMataKuliah {
  id: number;
  cplId: number;
  mataKuliahId: number;
  bobot: string | null;
  cpl: { id: number; kode: string; deskripsi: string };
  mataKuliah: { id: number; kode: string; nama: string };
}

export interface CplMataKuliahMatriks {
  cpl: { id: number; kode: string; deskripsi: string };
  bobotPerMk: { mataKuliahId: number; bobot: number; bobotRaw: number }[];
}

export const cplMataKuliahController = {
  async getAll(params?: { cplId?: number; mataKuliahId?: number; kurikulumId?: number }): Promise<CplMataKuliah[]> {
    const qs = new URLSearchParams();
    if (params?.cplId) qs.set('cplId', String(params.cplId));
    if (params?.mataKuliahId) qs.set('mataKuliahId', String(params.mataKuliahId));
    if (params?.kurikulumId) qs.set('kurikulumId', String(params.kurikulumId));
    const query = qs.toString();
    return fetchApi<CplMataKuliah[]>(`/cpl-mata-kuliah${query ? `?${query}` : ''}`);
  },

  async create(data: { cplId: number; mataKuliahId: number; bobot?: number | null }): Promise<CplMataKuliah> {
    return fetchApi<CplMataKuliah>('/cpl-mata-kuliah', { method: 'POST', body: JSON.stringify(data) });
  },

  async update(id: number, data: { bobot?: number | null }): Promise<CplMataKuliah> {
    return fetchApi<CplMataKuliah>(`/cpl-mata-kuliah/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  async delete(id: number): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/cpl-mata-kuliah/${id}`, { method: 'DELETE' });
  },

  async getMatriks(kurikulumId: number): Promise<{
    cpl: { id: number; kode: string; deskripsi: string }[];
    mataKuliah: { id: number; kode: string; nama: string }[];
    matriks: CplMataKuliahMatriks[];
  }> {
    return fetchApi(`/cpl-mata-kuliah/matriks?kurikulumId=${kurikulumId}`);
  },

  async validateBobot(cplId: number): Promise<{ total: number; isValid: boolean }> {
    return fetchApi(`/cpl-mata-kuliah/validate-bobot?cplId=${cplId}`);
  },
};

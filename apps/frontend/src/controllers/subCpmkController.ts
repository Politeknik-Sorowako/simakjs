import { fetchApi } from '../utils/api';

export interface SubCpmk {
  id: number;
  cpmkId: number;
  kode: string;
  deskripsi: string;
  urutan: number;
  cpmk?: { id: number; kode: string; mataKuliah?: { id: number; kode: string; nama: string } };
}

export const subCpmkController = {
  async getByCpmk(cpmkId: number): Promise<SubCpmk[]> {
    return fetchApi<SubCpmk[]>(`/sub-cpmk?cpmkId=${cpmkId}`);
  },

  async getById(id: number): Promise<SubCpmk> {
    return fetchApi<SubCpmk>(`/sub-cpmk/${id}`);
  },

  async create(data: { cpmkId: number; kode: string; deskripsi: string; urutan?: number }): Promise<SubCpmk> {
    return fetchApi<SubCpmk>('/sub-cpmk', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: number, data: Partial<{ kode: string; deskripsi: string; urutan: number }>): Promise<SubCpmk> {
    return fetchApi<SubCpmk>(`/sub-cpmk/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: number): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/sub-cpmk/${id}`, {
      method: 'DELETE',
    });
  },
};

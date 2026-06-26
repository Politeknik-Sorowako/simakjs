import { fetchApi } from '../utils/api';
import { PaginatedResponse } from './prodiController';
import { MataKuliah } from './mataKuliahController';
import { PeriodeAkademik } from './periodeAkademikController';

export interface KelasKuliah {
  id: number;
  mataKuliahId: number;
  periodeId: string;
  namaKelas: string;
  mataKuliah?: MataKuliah | null;
  periodeAkademik?: PeriodeAkademik | null;
  idPddikti?: string | null;
  isSynced?: boolean;
}

export const kelasKuliahController = {
  async getAll(search?: string, page?: number, limit?: number): Promise<PaginatedResponse<KelasKuliah>> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (page) params.append('page', String(page));
    if (limit) params.append('limit', String(limit));
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return fetchApi<PaginatedResponse<KelasKuliah>>(`/kelas-kuliah${queryString}`);
  },

  async getById(id: number): Promise<KelasKuliah> {
    return fetchApi<KelasKuliah>(`/kelas-kuliah/${id}`);
  },

  async create(data: Omit<KelasKuliah, 'id'>): Promise<KelasKuliah> {
    return fetchApi<KelasKuliah>('/kelas-kuliah', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: number, data: Partial<Omit<KelasKuliah, 'id'>>): Promise<KelasKuliah> {
    return fetchApi<KelasKuliah>(`/kelas-kuliah/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: number): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/kelas-kuliah/${id}`, {
      method: 'DELETE',
    });
  },
};

import { fetchApi } from '../utils/api';
import { PaginatedResponse, Prodi } from './prodiController';

export interface MataKuliah {
  id: number;
  kode: string;
  nama: string;
  sksTotal: number;
  sksTatapMuka?: number | null;
  sksPraktek?: number | null;
  programStudiId: number | null;
  programStudi?: Prodi | null;
  idPddikti?: string | null;
  isSynced?: boolean;
}

export const mataKuliahController = {
  async getAll(search?: string, page?: number, limit?: number, programStudiId?: number): Promise<PaginatedResponse<MataKuliah>> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (page) params.append('page', String(page));
    if (limit) params.append('limit', String(limit));
    if (programStudiId) params.append('programStudiId', String(programStudiId));
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return fetchApi<PaginatedResponse<MataKuliah>>(`/mata-kuliah${queryString}`);
  },

  async getById(id: number): Promise<MataKuliah> {
    return fetchApi<MataKuliah>(`/mata-kuliah/${id}`);
  },

  async create(data: Omit<MataKuliah, 'id'>): Promise<MataKuliah> {
    return fetchApi<MataKuliah>('/mata-kuliah', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: number, data: Partial<Omit<MataKuliah, 'id'>>): Promise<MataKuliah> {
    return fetchApi<MataKuliah>(`/mata-kuliah/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: number): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/mata-kuliah/${id}`, {
      method: 'DELETE',
    });
  },
};

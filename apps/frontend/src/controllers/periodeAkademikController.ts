import { fetchApi } from '../utils/api';
import { PaginatedResponse } from './prodiController';

export interface PeriodeAkademik {
  id: string; // misal "20231"
  nama: string;
  aktif: boolean;
  idPddikti?: string | null;
  isSynced?: boolean;
}

export const periodeAkademikController = {
  async getAll(search?: string, page?: number, limit?: number): Promise<PaginatedResponse<PeriodeAkademik>> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (page) params.append('page', String(page));
    if (limit) params.append('limit', String(limit));
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return fetchApi<PaginatedResponse<PeriodeAkademik>>(`/periode-akademik${queryString}`);
  },

  async getById(id: string): Promise<PeriodeAkademik> {
    return fetchApi<PeriodeAkademik>(`/periode-akademik/${id}`);
  },

  async create(data: PeriodeAkademik): Promise<PeriodeAkademik> {
    return fetchApi<PeriodeAkademik>('/periode-akademik', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: Partial<Omit<PeriodeAkademik, 'id'>>): Promise<PeriodeAkademik> {
    return fetchApi<PeriodeAkademik>(`/periode-akademik/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/periode-akademik/${id}`, {
      method: 'DELETE',
    });
  },
};

import { fetchApi } from '../utils/api';

export interface Prodi {
  id: number;
  kode: string;
  nama: string;
  jenjang: string;
  idPddikti?: string | null;
  isSynced?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const prodiController = {
  async getAll(search?: string, page?: number, limit?: number): Promise<PaginatedResponse<Prodi>> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (page) params.append('page', String(page));
    if (limit) params.append('limit', String(limit));
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return fetchApi<PaginatedResponse<Prodi>>(`/prodi${queryString}`);
  },

  async getById(id: number): Promise<Prodi> {
    return fetchApi<Prodi>(`/prodi/${id}`);
  },

  async create(data: Omit<Prodi, 'id'>): Promise<Prodi> {
    return fetchApi<Prodi>('/prodi', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: number, data: Partial<Omit<Prodi, 'id'>>): Promise<Prodi> {
    return fetchApi<Prodi>(`/prodi/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: number): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/prodi/${id}`, {
      method: 'DELETE',
    });
  },
};

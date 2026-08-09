import { fetchApi } from '../utils/api';
import { eden, unwrap } from '../utils/eden';

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
    const query: Record<string, string> = {};
    if (search) query.search = search;
    if (page) query.page = String(page);
    if (limit) query.limit = String(limit);
    return unwrap<PaginatedResponse<Prodi>>(
      eden.prodi.get({ $query: query }) as unknown as Promise<{
        data?: PaginatedResponse<Prodi>;
        error?: unknown;
      }>,
    );
  },

  async getById(id: number): Promise<Prodi> {
    return fetchApi<Prodi>(`/prodi/${id}`);
  },

  async create(data: Omit<Prodi, 'id'>): Promise<Prodi> {
    return unwrap<Prodi>(
      eden.prodi.post(
        data as { kode: string; nama: string; jenjang: string; idPddikti?: string },
      ) as unknown as Promise<{
        data?: Prodi;
        error?: unknown;
      }>,
    );
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

import { fetchApi } from '../utils/api';
import { PaginatedResponse, Prodi } from './prodiController';

export interface MataKuliah {
  id: number;
  kode: string;
  nama: string;
  sksTotal: number;
  sksTatapMuka?: number | null;
  sksPraktek?: number | null;
  sksPraktekLapangan?: number | null;
  sksSimulasi?: number | null;
  programStudi?: Prodi | null;
  semester?: number | null;
  kurikulum?: { kode: string; nama: string } | null;
  idPddikti?: string | null;
  isSynced?: boolean;
}

export const mataKuliahController = {
  async getAll(
    search?: string,
    page?: number,
    limit?: number,
    kurikulumId?: number,
    semester?: number,
    sortBy?: string,
    sortOrder?: string,
  ): Promise<PaginatedResponse<MataKuliah>> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (page) params.append('page', String(page));
    if (limit) params.append('limit', String(limit));
    if (kurikulumId) params.append('kurikulumId', String(kurikulumId));
    if (semester !== undefined) params.append('semester', String(semester));
    if (sortBy) params.append('sortBy', sortBy);
    if (sortOrder) params.append('sortOrder', sortOrder);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return fetchApi<PaginatedResponse<MataKuliah>>(`/mata-kuliah${queryString}`);
  },

  async getById(id: number): Promise<MataKuliah> {
    return fetchApi<MataKuliah>(`/mata-kuliah/${id}`);
  },

  async create(data: Omit<MataKuliah, 'id' | 'semester' | 'kurikulum' | 'programStudi'>): Promise<MataKuliah> {
    return fetchApi<MataKuliah>('/mata-kuliah', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: number, data: Partial<Omit<MataKuliah, 'id' | 'semester' | 'kurikulum' | 'programStudi'>>): Promise<MataKuliah> {
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

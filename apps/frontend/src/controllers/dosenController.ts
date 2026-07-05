import { fetchApi } from '../utils/api';
import { PaginatedResponse, Prodi } from './prodiController';

export interface Dosen {
  id: number;
  nip: string;
  nama: string;
  email: string;
  programStudiId: number | null;
  nidn?: string | null;
  nik?: string | null;
  jenisKelamin?: 'L' | 'P' | null;
  tanggalLahir?: string | null;
  programStudi?: Prodi | null;
  idPddikti?: string | null;
  isSynced?: boolean;
}

export const dosenController = {
  async getAll(
    search?: string,
    page?: number,
    limit?: number,
    programStudiId?: number,
  ): Promise<PaginatedResponse<Dosen>> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (page) params.append('page', String(page));
    if (limit) params.append('limit', String(limit));
    if (programStudiId) params.append('programStudiId', String(programStudiId));
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return fetchApi<PaginatedResponse<Dosen>>(`/dosen${queryString}`);
  },

  async getById(id: number): Promise<Dosen> {
    return fetchApi<Dosen>(`/dosen/${id}`);
  },

  async create(data: Omit<Dosen, 'id'>): Promise<Dosen> {
    return fetchApi<Dosen>('/dosen', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: number, data: Partial<Omit<Dosen, 'id'>>): Promise<Dosen> {
    return fetchApi<Dosen>(`/dosen/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: number): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/dosen/${id}`, {
      method: 'DELETE',
    });
  },
};

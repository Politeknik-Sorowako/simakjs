import { fetchApi } from '../utils/api';
import { PaginatedResponse } from './prodiController';
import { Mahasiswa } from './mahasiswaController';
import { KelasKuliah } from './kelasKuliahController';

export interface Krs {
  id: number;
  mahasiswaId: number;
  kelasKuliahId: number;
  nilaiAngka?: string | null;
  nilaiHuruf?: string | null;
  nilaiIndeks?: string | null;
  mahasiswa?: Mahasiswa | null;
  kelasKuliah?: KelasKuliah | null;
  idPddikti?: string | null;
  isSynced?: boolean;
}

export const krsController = {
  async getAll(search?: string, page?: number, limit?: number): Promise<PaginatedResponse<Krs>> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (page) params.append('page', String(page));
    if (limit) params.append('limit', String(limit));
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return fetchApi<PaginatedResponse<Krs>>(`/krs${queryString}`);
  },

  async getById(id: number): Promise<Krs> {
    return fetchApi<Krs>(`/krs/${id}`);
  },

  async create(data: Omit<Krs, 'id'>): Promise<Krs> {
    return fetchApi<Krs>('/krs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: number, data: Partial<Omit<Krs, 'id'>>): Promise<Krs> {
    return fetchApi<Krs>(`/krs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: number): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/krs/${id}`, {
      method: 'DELETE',
    });
  },

  async approve(mahasiswaId: number, periodeId: string): Promise<{ message: string; count: number }> {
    return fetchApi<{ message: string; count: number }>('/krs/approve', {
      method: 'POST',
      body: JSON.stringify({ mahasiswaId, periodeId }),
    });
  },

  async getPendingStudents(periodeId: string): Promise<any[]> {
    return fetchApi<any[]>(`/krs/pending-students?periodeId=${periodeId}`);
  },

  async approveBatch(mahasiswaIds: number[], periodeId: string): Promise<{ message: string; count: number }> {
    return fetchApi<{ message: string; count: number }>('/krs/approve-batch', {
      method: 'POST',
      body: JSON.stringify({ mahasiswaIds, periodeId }),
    });
  },
};

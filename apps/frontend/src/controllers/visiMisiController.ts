import { fetchApi } from '../utils/api';
import { Prodi } from './prodiController';

export interface VisiMisi {
  id: number;
  programStudiId: number;
  visi: string;
  misi: string;
  tujuan?: string | null;
  sasaran?: string | null;
  tahunBerlaku?: string | null;
  isAktif: boolean;
  programStudi?: Prodi | null;
}

export const visiMisiController = {
  async getAll(prodiId?: number): Promise<VisiMisi[]> {
    const params = new URLSearchParams();
    if (prodiId) params.append('prodiId', String(prodiId));
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return fetchApi<VisiMisi[]>(`/visi-misi${queryString}`);
  },

  async getAktif(prodiId: number): Promise<VisiMisi> {
    return fetchApi<VisiMisi>(`/visi-misi/aktif?prodiId=${prodiId}`);
  },

  async getById(id: number): Promise<VisiMisi> {
    return fetchApi<VisiMisi>(`/visi-misi/${id}`);
  },

  async create(data: Omit<VisiMisi, 'id'>): Promise<VisiMisi> {
    return fetchApi<VisiMisi>('/visi-misi', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: number, data: Partial<Omit<VisiMisi, 'id'>>): Promise<VisiMisi> {
    return fetchApi<VisiMisi>(`/visi-misi/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: number): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/visi-misi/${id}`, {
      method: 'DELETE',
    });
  },

  async setAktif(id: number): Promise<VisiMisi> {
    return fetchApi<VisiMisi>(`/visi-misi/${id}/set-aktif`, {
      method: 'PUT',
    });
  },
};

import { fetchApi } from '../utils/api';

export interface KategoriBimbingan {
  id: number;
  nama: string;
  deskripsi?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const kategoriBimbinganController = {
  async getAll(): Promise<{ data: KategoriBimbingan[] }> {
    return fetchApi<{ data: KategoriBimbingan[] }>('/kategori-bimbingan');
  },

  async create(data: { nama: string; deskripsi?: string }): Promise<KategoriBimbingan> {
    return fetchApi<KategoriBimbingan>('/kategori-bimbingan', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(
    id: number,
    data: { nama?: string; deskripsi?: string; isActive?: boolean },
  ): Promise<KategoriBimbingan> {
    return fetchApi<KategoriBimbingan>(`/kategori-bimbingan/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: number): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/kategori-bimbingan/${id}`, {
      method: 'DELETE',
    });
  },
};

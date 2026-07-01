import { fetchApi } from '../utils/api';
import { PaginatedResponse } from './prodiController';
import { Mahasiswa } from './mahasiswaController';

export interface Tagihan {
  id: number;
  mahasiswaId: number;
  periodeId: string;
  nominal: number;
  nominalTerbayar: number;
  status: string;
  tanggalBayar?: string | null;
  mahasiswa?: Mahasiswa | null;
}

export const tagihanController = {
  async getAll(search?: string, status?: string, page?: number, limit?: number): Promise<PaginatedResponse<Tagihan>> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status) params.append('status', status);
    if (page) params.append('page', String(page));
    if (limit) params.append('limit', String(limit));
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return fetchApi<PaginatedResponse<Tagihan>>(`/tagihan${queryString}`);
  },

  async generate(periodeId: string, nominal?: number): Promise<{ message: string; count: number }> {
    return fetchApi<{ message: string; count: number }>('/tagihan/generate', {
      method: 'POST',
      body: JSON.stringify({ periodeId, nominal }),
    });
  },

  async bayar(id: number, nominalBayar?: number): Promise<{ message: string; tagihan: Partial<Tagihan> }> {
    return fetchApi<{ message: string; tagihan: Partial<Tagihan> }>(`/tagihan/${id}/bayar`, {
      method: 'POST',
      body: nominalBayar !== undefined ? JSON.stringify({ nominalBayar }) : undefined
    });
  },
};

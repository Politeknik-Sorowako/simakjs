import { fetchApi } from '../utils/api';
import { PaginatedResponse } from './prodiController';
import { Mahasiswa } from './mahasiswaController';

export interface CutiRequest {
  id: number;
  mahasiswaId: number;
  periodeId: string;
  alasan: string;
  status: 'pending' | 'disetujui_pa' | 'disetujui_keuangan' | 'disetujui_prodi' | 'ditolak';
  catatan?: string | null;
  noSuratIzin?: string | null;
  tanggalSuratIzin?: string | null;
  mahasiswa?: Mahasiswa;
  periodeAkademik?: { id: string; nama: string };
  createdAt: string;
}

export const cutiController = {
  async getAll(page?: number, limit?: number, periodeId?: string, status?: string): Promise<PaginatedResponse<CutiRequest>> {
    const params = new URLSearchParams();
    if (page) params.append('page', String(page));
    if (limit) params.append('limit', String(limit));
    if (periodeId) params.append('periodeId', periodeId);
    if (status) params.append('status', status);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return fetchApi<PaginatedResponse<CutiRequest>>(`/cuti${queryString}`);
  },

  async getById(id: number): Promise<CutiRequest> {
    return fetchApi<CutiRequest>(`/cuti/${id}`);
  },

  async create(data: { periodeId: string; alasan: string }): Promise<CutiRequest> {
    return fetchApi<CutiRequest>('/cuti', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async approve(id: number, data: { action: 'approve' | 'reject'; catatan?: string; noSuratIzin?: string; tanggalSuratIzin?: string }): Promise<CutiRequest> {
    return fetchApi<CutiRequest>(`/cuti/${id}/approve`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: number): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/cuti/${id}`, {
      method: 'DELETE',
    });
  },
};

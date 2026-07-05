import { fetchApi } from '../utils/api';
import { PaginatedResponse } from './prodiController';
import { Mahasiswa } from './mahasiswaController';

export interface MahasiswaKeluarRecord {
  id: number;
  mahasiswaId: number;
  periodeId: string;
  statusBaru: 'keluar' | 'drop_out' | 'pindah' | 'wafat' | 'non_aktif';
  tanggalKeluar: string;
  alasanKeluar?: string | null;
  noSk?: string | null;
  tanggalSk?: string | null;
  ipk?: string | null;
  nomorIjazah?: string | null;
  mahasiswa?: Mahasiswa;
  periodeAkademik?: { id: string; nama: string };
  createdAt: string;
}

export const mahasiswaKeluarController = {
  async getAll(search?: string, page?: number, limit?: number, periodeId?: string): Promise<PaginatedResponse<MahasiswaKeluarRecord>> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (page) params.append('page', String(page));
    if (limit) params.append('limit', String(limit));
    if (periodeId) params.append('periodeId', periodeId);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return fetchApi<PaginatedResponse<MahasiswaKeluarRecord>>(`/mahasiswa-keluar${queryString}`);
  },

  async create(data: {
    mahasiswaId: number;
    periodeId: string;
    statusBaru: string;
    tanggalKeluar: string;
    alasanKeluar?: string;
    noSk?: string;
    tanggalSk?: string;
    ipk?: number;
    nomorIjazah?: string;
  }): Promise<MahasiswaKeluarRecord> {
    return fetchApi<MahasiswaKeluarRecord>('/mahasiswa-keluar', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async delete(id: number): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/mahasiswa-keluar/${id}`, {
      method: 'DELETE',
    });
  },
};

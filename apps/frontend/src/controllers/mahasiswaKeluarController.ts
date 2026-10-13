import { fetchApi } from '../utils/api';
import { LampiranStatus } from './cutiController';
import { Mahasiswa } from './mahasiswaController';
import { PaginatedResponse } from './prodiController';

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
  lampiran?: LampiranStatus[];
  createdAt: string;
}

export const mahasiswaKeluarController = {
  async getAll(
    search?: string,
    page?: number,
    limit?: number,
    periodeId?: string,
  ): Promise<PaginatedResponse<MahasiswaKeluarRecord>> {
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

  async update(
    id: number,
    data: {
      periodeId?: string;
      statusBaru?: string;
      tanggalKeluar?: string;
      alasanKeluar?: string | null;
      noSk?: string | null;
      tanggalSk?: string | null;
      ipk?: number | null;
      nomorIjazah?: string | null;
    },
  ): Promise<MahasiswaKeluarRecord> {
    return fetchApi<MahasiswaKeluarRecord>(`/mahasiswa-keluar/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async listLampiran(id: number): Promise<LampiranStatus[]> {
    return fetchApi<LampiranStatus[]>(`/mahasiswa-keluar/${id}/lampiran`);
  },

  async uploadLampiran(
    id: number,
    file: File,
    jenis: 'sk' | 'pendukung',
    keterangan?: string,
  ): Promise<LampiranStatus> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('jenis', jenis);
    if (keterangan) formData.append('keterangan', keterangan);
    return fetchApi<LampiranStatus>(`/mahasiswa-keluar/${id}/lampiran`, {
      method: 'POST',
      body: formData,
    });
  },

  async deleteLampiran(id: number, lampiranId: number): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/mahasiswa-keluar/${id}/lampiran/${lampiranId}`, {
      method: 'DELETE',
    });
  },

  async openLampiran(id: number, lampiranId: number): Promise<void> {
    const { API_URL } = await import('../utils/api');
    const res = await fetch(`${API_URL}/mahasiswa-keluar/${id}/lampiran/${lampiranId}/file`, {
      credentials: 'include',
    });
    if (!res.ok) {
      throw new Error('Gagal mengunduh atau membuka lampiran');
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  },

  async delete(id: number): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/mahasiswa-keluar/${id}`, {
      method: 'DELETE',
    });
  },
};

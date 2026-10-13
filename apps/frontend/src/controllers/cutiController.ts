import { fetchApi } from '../utils/api';
import { Mahasiswa } from './mahasiswaController';
import { PaginatedResponse } from './prodiController';

export interface LampiranStatus {
  id: number;
  jenis: 'sk' | 'pendukung';
  fileName: string;
  fileSize: number;
  fileType: string;
  keterangan?: string | null;
  createdAt: string;
}

export interface CutiRequest {
  id: number;
  mahasiswaId: number;
  periodeId: string;
  alasan: string;
  status: 'pending' | 'disetujui_pa' | 'disetujui_keuangan' | 'disetujui_prodi' | 'ditolak' | 'kembali_aktif';
  semesterMulaiCuti?: string | null;
  semesterBerakhirCuti?: string | null;
  catatan?: string | null;
  noSuratIzin?: string | null;
  tanggalSuratIzin?: string | null;
  mahasiswa?: Mahasiswa;
  periodeAkademik?: { id: string; nama: string };
  lampiran?: LampiranStatus[];
  createdAt: string;
}

export interface MahasiswaCuti extends Mahasiswa {
  pengajuanCuti?: CutiRequest[];
}

export const cutiController = {
  async getAll(
    page?: number,
    limit?: number,
    periodeId?: string,
    status?: string,
  ): Promise<PaginatedResponse<CutiRequest>> {
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

  async inputByAdmin(data: {
    mahasiswaId: number;
    periodeId: string;
    alasan: string;
    semesterMulaiCuti?: string;
    semesterBerakhirCuti?: string;
    noSuratIzin?: string;
    tanggalSuratIzin?: string;
  }): Promise<CutiRequest> {
    return fetchApi<CutiRequest>('/cuti/input', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(
    id: number,
    data: {
      periodeId?: string;
      alasan?: string;
      semesterMulaiCuti?: string | null;
      semesterBerakhirCuti?: string | null;
      noSuratIzin?: string | null;
      tanggalSuratIzin?: string | null;
      catatan?: string | null;
    },
  ): Promise<CutiRequest> {
    return fetchApi<CutiRequest>(`/cuti/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async listLampiran(id: number): Promise<LampiranStatus[]> {
    return fetchApi<LampiranStatus[]>(`/cuti/${id}/lampiran`);
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
    return fetchApi<LampiranStatus>(`/cuti/${id}/lampiran`, {
      method: 'POST',
      body: formData,
    });
  },

  async deleteLampiran(id: number, lampiranId: number): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/cuti/${id}/lampiran/${lampiranId}`, {
      method: 'DELETE',
    });
  },

  async openLampiran(id: number, lampiranId: number): Promise<void> {
    const { API_URL } = await import('../utils/api');
    const res = await fetch(`${API_URL}/cuti/${id}/lampiran/${lampiranId}/file`, {
      credentials: 'include',
    });
    if (!res.ok) {
      throw new Error('Gagal mengunduh atau membuka lampiran');
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    // Lepaskan object URL setelah tab baru sempat memuat berkas.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },

  async approve(
    id: number,
    data: { action: 'approve' | 'reject'; catatan?: string; noSuratIzin?: string; tanggalSuratIzin?: string },
  ): Promise<CutiRequest> {
    return fetchApi<CutiRequest>(`/cuti/${id}/approve`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async aktifKembali(id: number): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/cuti/${id}/aktif-kembali`, {
      method: 'PUT',
    });
  },

  async getMahasiswaCuti(
    page?: number,
    limit?: number,
    search?: string,
    periodeId?: string,
  ): Promise<PaginatedResponse<MahasiswaCuti>> {
    const params = new URLSearchParams();
    if (page) params.append('page', String(page));
    if (limit) params.append('limit', String(limit));
    if (search) params.append('search', search);
    if (periodeId) params.append('periodeId', periodeId);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return fetchApi<PaginatedResponse<MahasiswaCuti>>(`/cuti/mahasiswa-cuti${queryString}`);
  },

  async delete(id: number): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/cuti/${id}`, {
      method: 'DELETE',
    });
  },
};

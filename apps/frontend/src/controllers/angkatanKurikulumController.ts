import { fetchApi } from '../utils/api';

export interface AngkatanKurikulum {
  id: number;
  programStudiId: number;
  angkatan: string;
  kurikulumId: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  programStudi?: { id: number; kode: string; nama: string; jenjang: string } | null;
  kurikulum?: { id: number; kode: string; nama: string } | null;
}

export interface KurikulumDetail {
  id: number;
  kode: string;
  nama: string;
  programStudiId: number;
  isAktif: boolean;
  kurikulumMataKuliah: {
    id: number;
    mataKuliahId: number;
    semester: number;
    sksMataKuliah: number;
    isWajib: boolean;
    mataKuliah?: { id: number; kode: string; nama: string; sksTotal: number } | null;
  }[];
}

export const angkatanKurikulumController = {
  async getAll(programStudiId?: number): Promise<AngkatanKurikulum[]> {
    const params = programStudiId ? `?programStudiId=${programStudiId}` : '';
    return fetchApi<AngkatanKurikulum[]>(`/angkatan-kurikulum${params}`);
  },

  async getAktif(programStudiId: number, angkatan: string): Promise<KurikulumDetail> {
    return fetchApi<KurikulumDetail>(`/angkatan-kurikulum/aktif?programStudiId=${programStudiId}&angkatan=${angkatan}`);
  },

  async create(data: { programStudiId: number; angkatan: string; kurikulumId: number }): Promise<AngkatanKurikulum> {
    return fetchApi<AngkatanKurikulum>('/angkatan-kurikulum', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: number, data: Partial<AngkatanKurikulum>): Promise<AngkatanKurikulum> {
    return fetchApi<AngkatanKurikulum>(`/angkatan-kurikulum/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: number): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/angkatan-kurikulum/${id}`, {
      method: 'DELETE',
    });
  },
};

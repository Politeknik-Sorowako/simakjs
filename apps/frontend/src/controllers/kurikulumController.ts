import { fetchApi } from '../utils/api';
import { PaginatedResponse, Prodi } from './prodiController';
import { MataKuliah } from './mataKuliahController';

export interface Kurikulum {
  id: number;
  kode: string;
  nama: string;
  programStudiId: number;
  semesterMulai: string;
  jumlahSksLulus: number;
  jumlahSksWajib: number;
  jumlahSksPilihan: number;
  isAktif: boolean;
  programStudi?: Prodi | null;
  idPddikti?: string | null;
  isSynced?: boolean;
}

export interface KurikulumMataKuliah {
  id: number;
  kurikulumId: number;
  mataKuliahId: number;
  semester: number;
  sksMataKuliah: number;
  sksTatapMuka?: number | null;
  sksPraktek?: number | null;
  sksPraktekLapangan?: number | null;
  sksSimulasi?: number | null;
  isWajib: boolean;
  mataKuliah?: MataKuliah | null;
}

export interface KurikulumDetail extends Kurikulum {
  kurikulumMataKuliah: KurikulumMataKuliah[];
}

export const kurikulumController = {
  async getAll(search?: string, page?: number, limit?: number, prodiId?: number): Promise<PaginatedResponse<Kurikulum>> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (page) params.append('page', String(page));
    if (limit) params.append('limit', String(limit));
    if (prodiId) params.append('prodiId', String(prodiId));
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return fetchApi<PaginatedResponse<Kurikulum>>(`/kurikulum${queryString}`);
  },

  async getById(id: number): Promise<KurikulumDetail> {
    return fetchApi<KurikulumDetail>(`/kurikulum/${id}`);
  },

  async create(data: Omit<Kurikulum, 'id'>): Promise<Kurikulum> {
    return fetchApi<Kurikulum>('/kurikulum', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: number, data: Partial<Omit<Kurikulum, 'id'>>): Promise<Kurikulum> {
    return fetchApi<Kurikulum>(`/kurikulum/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: number): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/kurikulum/${id}`, {
      method: 'DELETE',
    });
  },

  async addMataKuliah(kurikulumId: number, data: Omit<KurikulumMataKuliah, 'id' | 'kurikulumId'>): Promise<KurikulumMataKuliah> {
    return fetchApi<KurikulumMataKuliah>(`/kurikulum/${kurikulumId}/mata-kuliah`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async removeMataKuliah(kurikulumId: number, mkId: number): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/kurikulum/${kurikulumId}/mata-kuliah/${mkId}`, {
      method: 'DELETE',
    });
  },
};

import { fetchApi } from '../utils/api';
import { eden, unwrap } from '../utils/eden';
import { MataKuliah } from './mataKuliahController';
import { PaginatedResponse, Prodi } from './prodiController';

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
  async getAll(
    search?: string,
    page?: number,
    limit?: number,
    prodiId?: number,
  ): Promise<PaginatedResponse<Kurikulum>> {
    const query: Record<string, string | number> = {};
    if (search) query.search = search;
    if (page) query.page = page;
    if (limit) query.limit = limit;
    if (prodiId) query.prodiId = prodiId;
    return unwrap<PaginatedResponse<Kurikulum>>(
      eden['kurikulum'].get({ $query: query }) as unknown as Promise<{
        data?: PaginatedResponse<Kurikulum>;
        error?: unknown;
      }>,
    );
  },

  async getById(id: number): Promise<KurikulumDetail> {
    return fetchApi<KurikulumDetail>(`/kurikulum/${id}`);
  },

  async create(data: Omit<Kurikulum, 'id'>): Promise<Kurikulum> {
    const res = (await eden['kurikulum'].post(data as never)) as unknown as {
      data?: Kurikulum;
      error?: unknown;
    };
    return unwrap<Kurikulum>(Promise.resolve(res));
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

  async addMataKuliah(
    kurikulumId: number,
    data: Omit<KurikulumMataKuliah, 'id' | 'kurikulumId'>,
  ): Promise<KurikulumMataKuliah> {
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

  async removeBatchMataKuliah(
    kurikulumId: number,
    mataKuliahIds: number[],
  ): Promise<{ message: string; deletedCount: number }> {
    return fetchApi<{ message: string; deletedCount: number }>(`/kurikulum/${kurikulumId}/mata-kuliah/batch`, {
      method: 'DELETE',
      body: JSON.stringify({ mataKuliahIds }),
    });
  },

  async copyFromKurikulum(
    kurikulumId: number,
    sourceKurikulumId: number,
  ): Promise<{ copied: number; skipped: number; sourceKode: string; sourceNama: string }> {
    return fetchApi(`/kurikulum/${kurikulumId}/copy-from`, {
      method: 'POST',
      body: JSON.stringify({ sourceKurikulumId }),
    });
  },

  async importMkCsv(
    kurikulumId: number,
    file: File,
  ): Promise<{ imported: number; skipped: number; errors: { baris: number; pesan: string }[] }> {
    const formData = new FormData();
    formData.append('file', file);
    return fetchApi(`/kurikulum/${kurikulumId}/import-mk`, {
      method: 'POST',
      body: formData,
      headers: {},
    });
  },

  async duplicate(id: number, kodeBaru: string, namaBaru: string): Promise<{ id: number; kode: string; nama: string }> {
    return fetchApi(`/kurikulum/${id}/duplicate`, {
      method: 'POST',
      body: JSON.stringify({ kodeBaru, namaBaru }),
    });
  },
};

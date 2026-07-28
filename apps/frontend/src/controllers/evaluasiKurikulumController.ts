import { fetchApi } from '../utils/api';

export interface EvaluasiKurikulum {
  id: number;
  kurikulumId: number;
  periodeId: string | null;
  sumber: string;
  aspek: string;
  temuan: string;
  rekomendasi: string | null;
  tindakLanjut: string | null;
  status: string;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  kurikulum?: { id: number; kode: string; nama: string };
  periode?: { id: string; nama: string };
  createdByUser?: { id: number; nama: string; email: string };
}

export interface EvaluasiKurikulumList {
  data: EvaluasiKurikulum[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export const evaluasiKurikulumController = {
  async getAll(params?: {
    page?: number;
    limit?: number;
    kurikulumId?: number;
    periodeId?: string;
    status?: string;
  }): Promise<EvaluasiKurikulumList> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.kurikulumId) qs.set('kurikulumId', String(params.kurikulumId));
    if (params?.periodeId) qs.set('periodeId', params.periodeId);
    if (params?.status) qs.set('status', params.status);
    const query = qs.toString();
    return fetchApi<EvaluasiKurikulumList>(`/evaluasi-kurikulum${query ? `?${query}` : ''}`);
  },

  async getById(id: number): Promise<EvaluasiKurikulum> {
    return fetchApi<EvaluasiKurikulum>(`/evaluasi-kurikulum/${id}`);
  },

  async create(data: {
    kurikulumId: number;
    periodeId?: string | null;
    sumber?: string;
    aspek: string;
    temuan: string;
    rekomendasi?: string | null;
    tindakLanjut?: string | null;
    status?: string;
  }): Promise<EvaluasiKurikulum> {
    return fetchApi<EvaluasiKurikulum>('/evaluasi-kurikulum', { method: 'POST', body: JSON.stringify(data) });
  },

  async update(
    id: number,
    data: {
      aspek?: string;
      temuan?: string;
      rekomendasi?: string | null;
      tindakLanjut?: string | null;
      status?: string;
    },
  ): Promise<EvaluasiKurikulum> {
    return fetchApi<EvaluasiKurikulum>(`/evaluasi-kurikulum/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  async delete(id: number): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/evaluasi-kurikulum/${id}`, { method: 'DELETE' });
  },
};

import { fetchApi } from '../utils/api';

export type JenisKompen = 'sakit' | 'izin' | 'alpa' | 'terlambat' | 'rusak';

export const JENIS_KOMPEN_LABEL: Record<JenisKompen, string> = {
  sakit: 'Sakit',
  izin: 'Izin',
  alpa: 'Alpa',
  terlambat: 'Terlambat',
  rusak: 'Rusak',
};

export interface KompensasiManualRecord {
  id: number;
  mahasiswaId: number;
  tanggal: string;
  jenisKompen: JenisKompen;
  durasiMenit: number;
  keterangan?: string | null;
  createdBy?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface KompensasiManualCreateResponse extends KompensasiManualRecord {
  isDuplicateRisk: boolean;
}

export interface DuplicateRiskItem {
  mahasiswaId: number;
  nim: string;
  nama: string;
  tanggal: string;
  count: number;
  totalMenit: number;
  records: Array<{
    id: number;
    jenisKompen: JenisKompen;
    durasiMenit: number;
    keterangan?: string | null;
    createdAt?: string;
  }>;
}

export interface KompensasiManualStats {
  totalRecords: number;
  totalMenit: number;
  duplicateRiskCount: number;
  perJenis: Record<JenisKompen, { count: number; totalMenit: number }>;
}

export const kompensasiManualController = {
  async create(data: {
    mahasiswaId: number;
    tanggal: string;
    jenisKompen: JenisKompen;
    durasiMenit?: number;
    keterangan?: string;
  }): Promise<KompensasiManualCreateResponse> {
    return fetchApi<KompensasiManualCreateResponse>('/kompensasi-manual', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(
    id: number,
    data: Partial<{
      tanggal: string;
      jenisKompen: JenisKompen;
      durasiMenit?: number;
      keterangan?: string | null;
    }>,
  ): Promise<KompensasiManualRecord> {
    return fetchApi<KompensasiManualRecord>(`/kompensasi-manual/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async remove(id: number): Promise<{ success: boolean }> {
    return fetchApi<{ success: boolean }>(`/kompensasi-manual/${id}`, {
      method: 'DELETE',
    });
  },

  async bulkDelete(ids: number[]): Promise<{ success: boolean; deleted: number }> {
    return fetchApi<{ success: boolean; deleted: number }>('/kompensasi-manual/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  },

  async bulkUpdate(
    ids: number[],
    data: { jenisKompen?: JenisKompen; durasiMenit?: number },
  ): Promise<{ success: boolean; updated: number }> {
    return fetchApi<{ success: boolean; updated: number }>('/kompensasi-manual/bulk-update', {
      method: 'POST',
      body: JSON.stringify({ ids, ...data }),
    });
  },

  async getRiwayat(mahasiswaId: number): Promise<KompensasiManualRecord[]> {
    return fetchApi<KompensasiManualRecord[]>(`/kompensasi-manual/riwayat/${mahasiswaId}`);
  },

  async getDuplicateRisk(mahasiswaId?: number, tanggal?: string): Promise<DuplicateRiskItem[]> {
    const params = new URLSearchParams();
    if (mahasiswaId) params.append('mahasiswaId', String(mahasiswaId));
    if (tanggal) params.append('tanggal', tanggal);
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchApi<DuplicateRiskItem[]>(`/kompensasi-manual/duplicate-risk${query}`);
  },

  async getStats(): Promise<KompensasiManualStats> {
    return fetchApi<KompensasiManualStats>('/kompensasi-manual/stats');
  },

  async getAll(params?: {
    search?: string;
    tanggal?: string;
    jenisKompen?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    data: Array<
      KompensasiManualRecord & {
        mahasiswaNim: string;
        mahasiswaNama: string;
      }
    >;
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.tanggal) query.append('tanggal', params.tanggal);
    if (params?.jenisKompen) query.append('jenisKompen', params.jenisKompen);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.sortBy) query.append('sortBy', params.sortBy);
    if (params?.sortOrder) query.append('sortOrder', params.sortOrder);

    const qStr = query.toString() ? `?${query.toString()}` : '';
    return fetchApi(`/kompensasi-manual${qStr}`);
  },
};

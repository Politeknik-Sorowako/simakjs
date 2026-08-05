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
};

import { fetchApi } from '../utils/api';
import { Mahasiswa } from './mahasiswaController';
import { PaginatedResponse } from './prodiController';

export interface TagihanStatsResponse {
  totalMahasiswa?: number;
  totalTagihan?: number;
  totalTerbayar?: number;
  totalTunggakan?: number;
  summary?: {
    totalTagihan: number;
    totalTerbayar: number;
    totalTunggakan: number;
    persentaseLunas: number;
  };
  statusBreakdown?: {
    lunas?: number;
    cicilan?: number;
    belum_bayar?: number;
    [key: string]: number | undefined;
  };
  rekapPerProdi?: Array<{
    prodiNama: string;
    total: number;
    terbayar: number;
    tunggakan: number;
  }>;
}

export interface Tagihan {
  id: number;
  mahasiswaId: number;
  periodeId: string;
  nominal: number;
  nominalTerbayar: number;
  status: string;
  tanggalBayar?: string | null;
  mahasiswa?: Mahasiswa | null;
}

export interface TransaksiPembayaran {
  id: number;
  tagihanId: number;
  nominalBayar: number;
  tanggalTransaksi: string;
  petugasId?: number | null;
  isVoid: boolean;
  catatanKoreksi?: string | null;
  petugas?: {
    id: number;
    nama: string;
    email: string;
  } | null;
}

export interface AngsuranTagihan {
  id: number;
  tagihanId: number;
  terminKe: number;
  nominal: number;
  nominalTerbayar: number;
  jatuhTempo: string;
  status: string;
}

export interface SkemaTarif {
  id: number;
  angkatan: string;
  programStudiId: number;
  nominal: number;
  termin1Nominal?: number | null;
  termin1TempoHari?: number | null;
  termin2Nominal?: number | null;
  termin2TempoHari?: number | null;
  programStudi?: {
    id: number;
    nama: string;
    kode: string;
  } | null;
}

export const tagihanController = {
  async getAll(search?: string, status?: string, page?: number, limit?: number): Promise<PaginatedResponse<Tagihan>> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status) params.append('status', status);
    if (page) params.append('page', String(page));
    if (limit) params.append('limit', String(limit));
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return fetchApi<PaginatedResponse<Tagihan>>(`/tagihan${queryString}`);
  },

  async generate(periodeId: string, nominal?: number): Promise<{ message: string; count: number }> {
    return fetchApi<{ message: string; count: number }>('/tagihan/generate', {
      method: 'POST',
      body: JSON.stringify({ periodeId, nominal }),
    });
  },

  async bayar(
    id: number,
    nominalBayar?: number,
    catatanKoreksi?: string,
  ): Promise<{ message: string; tagihan: Partial<Tagihan> }> {
    return fetchApi<{ message: string; tagihan: Partial<Tagihan> }>(`/tagihan/${id}/bayar`, {
      method: 'POST',
      body: JSON.stringify({ nominalBayar, catatanKoreksi }),
    });
  },

  async updateNominal(id: number, nominal: number): Promise<{ message: string; tagihan: Partial<Tagihan> }> {
    return fetchApi<{ message: string; tagihan: Partial<Tagihan> }>(`/tagihan/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ nominal }),
    });
  },

  async getRiwayatTransaksi(tagihanId: number): Promise<{ data: TransaksiPembayaran[] }> {
    return fetchApi<{ data: TransaksiPembayaran[] }>(`/tagihan/${tagihanId}/transaksi`);
  },

  async getAngsuran(tagihanId: number): Promise<{ data: AngsuranTagihan[] }> {
    return fetchApi<{ data: AngsuranTagihan[] }>(`/tagihan/${tagihanId}/angsuran`);
  },

  async getOverdue(periodeId?: string): Promise<{ data: Array<AngsuranTagihan & { mahasiswa?: Mahasiswa | null }> }> {
    const qs = periodeId ? `?periodeId=${encodeURIComponent(periodeId)}` : '';
    return fetchApi(`/tagihan/overdue${qs}`);
  },

  async voidTransaksi(transaksiId: number, catatan: string): Promise<{ message: string; tagihan: Partial<Tagihan> }> {
    return fetchApi<{ message: string; tagihan: Partial<Tagihan> }>(`/tagihan/transaksi/${transaksiId}/void`, {
      method: 'POST',
      body: JSON.stringify({ catatan }),
    });
  },

  async getAllTarif(): Promise<{ data: SkemaTarif[] }> {
    return fetchApi<{ data: SkemaTarif[] }>('/tagihan/tarif');
  },

  async createTarif(
    angkatan: string,
    programStudiId: number,
    nominal: number,
    termin?: {
      termin1Nominal?: number;
      termin1TempoHari?: number;
      termin2Nominal?: number;
      termin2TempoHari?: number;
    },
  ): Promise<{ message: string; data: SkemaTarif }> {
    return fetchApi<{ message: string; data: SkemaTarif }>('/tagihan/tarif', {
      method: 'POST',
      body: JSON.stringify({ angkatan, programStudiId, nominal, ...termin }),
    });
  },

  async deleteTarif(id: number): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/tagihan/tarif/${id}`, {
      method: 'DELETE',
    });
  },

  async getStats(periodeId?: string, programStudiId?: number): Promise<TagihanStatsResponse> {
    const params = new URLSearchParams();
    if (periodeId) params.append('periodeId', periodeId);
    if (programStudiId) params.append('programStudiId', String(programStudiId));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return fetchApi<TagihanStatsResponse>(`/tagihan/stats${qs}`);
  },
};

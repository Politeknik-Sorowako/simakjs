import { fetchApi } from '../utils/api';
import { PaginatedResponse } from './prodiController';

export interface CPMK {
  id: number;
  mataKuliahId: number;
  kode: string;
  deskripsi: string;
}

export interface BAP {
  id: number;
  kelasKuliahId: number;
  tanggal: string;
  pertemuanKe: number;
  materi: string;
  durasiMenit: number;
  cpmkId: number;
  dosenId: number;
}

export interface PresensiItem {
  id?: number;
  bapId?: number;
  mahasiswaId: number;
  status: 'hadir' | 'sakit' | 'izin' | 'telat' | 'alpa';
  durasiMangkir: number;
}

export interface KompensasiLaporanItem {
  id: number;
  nim: string;
  nama: string;
  prodiNama: string;
  totalKompensasi: number;
  totalDibayar: number;
  sisaKompensasi: number;
}

export interface KompensasiStatsResponse {
  summary: {
    totalMahasiswa: number;
    totalKompensasi: number;
    totalDibayar: number;
    totalSisa: number;
  };
  rekapProdi: Array<{
    prodiNama: string;
    jumlahMahasiswa: number;
    totalKompensasi: number;
    totalDibayar: number;
    sisaKompensasi: number;
  }>;
  top10: KompensasiLaporanItem[];
}

export interface PaymentItem {
  id: number;
  mahasiswaId: number;
  jumlahMenit: number;
  tanggal: string;
  keterangan: string;
  petugasId: number;
}

export interface KompensasiDetailResponse {
  mahasiswa: {
    id: number;
    nim: string;
    nama: string;
    email: string;
    programStudiId: number;
  };
  historyKompensasi: Array<{
    id: number;
    bapId: number;
    status: 'hadir' | 'sakit' | 'izin' | 'telat' | 'alpa';
    durasiMangkir: number;
    createdAt: string;
    bapPertemuan: number;
    bapMateri: string;
    bapTanggal: string;
    poinKompensasi: number;
  }>;
  payments: PaymentItem[];
  summary: {
    totalKompensasi: number;
    totalDibayar: number;
    sisaKompensasi: number;
  };
}

export const presensiController = {
  // CPMK
  async getCpmkByMataKuliah(mataKuliahId: number): Promise<CPMK[]> {
    return fetchApi<CPMK[]>(`/cpmk/mata-kuliah/${mataKuliahId}`);
  },

  async createCpmk(data: { mataKuliahId: number; kode: string; deskripsi: string }): Promise<CPMK> {
    return fetchApi<CPMK>('/cpmk', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getBapByKelas(kelasKuliahId: number): Promise<BAP[]> {
    return fetchApi<BAP[]>(`/bap/kelas/${kelasKuliahId}`);
  },

  async getRpsTopikByKelas(kelasKuliahId: number): Promise<
    Array<{
      id: number;
      rpsId: number;
      pertemuanKe: number;
      topik: string;
      subTopik: string | null;
      metode: string | null;
      cpmkId: number | null;
    }>
  > {
    return fetchApi<any[]>(`/bap/kelas/${kelasKuliahId}/topik`);
  },

  async createBap(data: Omit<BAP, 'id'>): Promise<BAP> {
    return fetchApi<BAP>('/bap', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateBap(id: number, data: Partial<Omit<BAP, 'id'>>): Promise<BAP> {
    return fetchApi<BAP>(`/bap/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Presensi
  async saveBulkPresensi(data: {
    bapId: number;
    presensiList: Array<{ mahasiswaId: number; status: string; durasiMangkir?: number }>;
  }): Promise<{ message: string }> {
    return fetchApi<{ message: string }>('/presensi/bulk', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getPresensiByBap(bapId: number): Promise<PresensiItem[]> {
    return fetchApi<PresensiItem[]>(`/presensi/bap/${bapId}`);
  },

  // Rekap Kehadiran
  async getRekapKehadiran(kelasKuliahId: number): Promise<any> {
    return fetchApi<any>(`/presensi/rekap-kehadiran?kelasKuliahId=${kelasKuliahId}`);
  },

  async getRekapKehadiranMahasiswa(mahasiswaId: number, periodeId?: string): Promise<any> {
    const params = new URLSearchParams({ mahasiswaId: String(mahasiswaId) });
    if (periodeId) params.append('periodeId', periodeId);
    return fetchApi<any>(`/presensi/rekap-kehadiran-mahasiswa?${params.toString()}`);
  },

  // Kompensasi
  async getKompensasiStats(): Promise<KompensasiStatsResponse> {
    return fetchApi<KompensasiStatsResponse>('/presensi/kompensasi/stats');
  },

  async getLaporanKompensasi(
    page?: number,
    limit?: number,
    search?: string,
    prodiId?: number,
  ): Promise<PaginatedResponse<KompensasiLaporanItem>> {
    const params = new URLSearchParams();
    if (page) params.append('page', String(page));
    if (limit) params.append('limit', String(limit));
    if (search) params.append('search', search);
    if (prodiId) params.append('prodiId', String(prodiId));
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return fetchApi<PaginatedResponse<KompensasiLaporanItem>>(`/presensi/kompensasi/laporan${queryString}`);
  },

  async getKompensasiDetail(mahasiswaId: number): Promise<KompensasiDetailResponse> {
    return fetchApi<KompensasiDetailResponse>(`/presensi/kompensasi/mahasiswa/${mahasiswaId}`);
  },

  async bayarKompensasi(data: {
    mahasiswaId: number;
    jumlahMenit: number;
    tanggal: string;
    keterangan: string;
  }): Promise<PaymentItem> {
    return fetchApi<PaymentItem>('/presensi/kompensasi/bayar', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateKompensasiBayar(
    id: number,
    data: Partial<Omit<PaymentItem, 'id' | 'mahasiswaId'>>,
  ): Promise<PaymentItem> {
    return fetchApi<PaymentItem>(`/presensi/kompensasi/bayar/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

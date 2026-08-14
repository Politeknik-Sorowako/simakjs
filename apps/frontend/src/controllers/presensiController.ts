import { fetchApi } from '../utils/api';
import { PaginatedResponse } from './prodiController';

export interface CPMK {
  id: number;
  mataKuliahId: number;
  kode: string;
  deskripsi: string;
}

export interface RekapKehadiranMahasiswaItem {
  id?: number;
  nim: string;
  nama: string;
  hadir: number;
  sakit: number;
  izin: number;
  alpa: number;
  telat: number;
  persentaseHadir: number;
}

export interface RekapKehadiranKelasResponse {
  kelas?: {
    namaKelas?: string;
    kodeMataKuliah?: string;
    mataKuliah?: { nama: string };
    periodeId?: string;
  };
  totalPertemuan: number;
  mahasiswa: RekapKehadiranMahasiswaItem[];
}

export interface BAP {
  id: number;
  kelasKuliahId: number;
  tanggal: string;
  pertemuanKe: number;
  tema?: string | null;
  materi: string;
  catatan?: string | null;
  durasiMenit: number;
  cpmkId?: number | null;
  topikIds?: number[];
  dosenId: number;
}

export interface PresensiItem {
  id?: number;
  bapId?: number;
  mahasiswaId: number;
  status: 'hadir' | 'sakit' | 'izin' | 'telat' | 'alpa' | 'unknown';
  durasiMangkir: number;
  keterangan?: string | null;
  keteranganAdmin?: string | null;
  resolvedAt?: string | null;
  resolvedBy?: number | null;
  isVerified?: boolean | null;
  verifiedAt?: string | null;
  verifiedByName?: string | null;
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

export interface MonitoringRpsItem {
  kelasKuliahId: number;
  namaKelas: string;
  mataKuliahKode: string;
  mataKuliahNama: string;
  prodiNama: string;
  dosenPengajar: string;
  totalTopikRps: number;
  topikDiajarkanCount: number;
  persentaseCapaian: number;
  totalBapRecorded: number;
  status: string;
}

export interface MonitoringRpsDetailMatrixItem {
  topikId: number;
  pertemuanRps: number;
  topik: string;
  subTopik: string | null;
  diajarkan: boolean;
  bapInfo: {
    bapId: number;
    tanggal: string;
    pertemuanKe: number;
    dosenNama: string;
  } | null;
}

export interface MonitoringRpsDetailResponse {
  kelasKuliahId: number;
  namaKelas: string;
  mataKuliahKode: string;
  mataKuliahNama: string;
  prodiNama: string;
  dosenPengajar: string;
  matrix: MonitoringRpsDetailMatrixItem[];
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
    bapId: number | null;
    sumber: 'perkuliahan' | 'apel' | 'manual';
    status: 'hadir' | 'sakit' | 'izin' | 'telat' | 'alpa' | 'terlambat' | 'unknown';
    verifiedStatus?: 'hadir' | 'sakit' | 'izin' | 'telat' | 'alpa' | 'terlambat' | 'unknown' | null;
    keteranganAdmin?: string | null;
    durasiMangkir: number;
    createdAt: string;
    bapPertemuan: number | null;
    bapMateri: string | null;
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

export interface PresensiUnknownItem {
  id: number;
  bapId: number;
  mahasiswaId: number;
  nim: string;
  nama: string;
  programStudiId?: number | null;
  prodiNama?: string | null;
  status: string;
  durasiMangkir: number;
  keterangan?: string | null;
  lampiranEvidens?: string | null;
  keteranganAdmin?: string | null;
  resolvedAt?: string | null;
  resolvedBy?: number | null;
  resolvedByName?: string | null;
  createdAt?: string | null;
  bapTanggal: string;
  bapPertemuan: number;
  bapMateri: string;
  kelasKuliahId?: number | null;
  namaKelas?: string | null;
  periodeId?: string | null;
  mataKuliahKode?: string | null;
  mataKuliahNama?: string | null;
  dosenNama?: string | null;
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
    return fetchApi<
      Array<{
        id: number;
        rpsId: number;
        pertemuanKe: number;
        topik: string;
        subTopik: string | null;
        metode: string | null;
        cpmkId: number | null;
      }>
    >(`/bap/kelas/${kelasKuliahId}/topik`);
  },

  async createBap(
    data: Omit<BAP, 'id'> & {
      tema?: string | null;
    },
  ): Promise<BAP> {
    return fetchApi<BAP>('/bap', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async duplicateBap(
    bapId: number,
    data: { pertemuanKe: number; tanggal?: string },
  ): Promise<BAP & { presensiCount: number }> {
    return fetchApi<BAP & { presensiCount: number }>(`/bap/${bapId}/duplicate`, {
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

  async updateBapBulk(data: {
    bapId: number;
    tanggal: string;
    pertemuanIds: number[];
    tema?: string | null;
    materi: string;
    catatan?: string | null;
    durasiMenit: number;
    cpmkId?: number | null;
    topikIds?: number[];
    dosenId?: number;
  }): Promise<BAP[]> {
    return fetchApi<BAP[]>('/bap/bulk', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteBap(id: number): Promise<{ success: boolean; id: number }> {
    return fetchApi<{ success: boolean; id: number }>(`/bap/${id}`, {
      method: 'DELETE',
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

  // Unknown (verifikasi admin/prodi)
  async getUnknownList(
    page?: number,
    limit?: number,
    search?: string,
    prodiId?: number,
    statusFilter?: 'belum' | 'sudah',
  ): Promise<PaginatedResponse<PresensiUnknownItem>> {
    const params = new URLSearchParams();
    if (page) params.append('page', String(page));
    if (limit) params.append('limit', String(limit));
    if (search) params.append('search', search);
    if (prodiId) params.append('prodiId', String(prodiId));
    if (statusFilter) params.append('statusFilter', statusFilter);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return fetchApi<PaginatedResponse<PresensiUnknownItem>>(`/presensi/unknown-list${queryString}`);
  },

  async resolveUnknown(
    id: number,
    data: { newStatus: 'sakit' | 'izin' | 'alpa'; keteranganAdmin?: string; isAnulir?: boolean },
  ): Promise<PresensiUnknownItem> {
    return fetchApi<PresensiUnknownItem>(`/presensi/unknown/${id}/resolve`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async verifikasiUnknown(data: {
    sumber: 'BAP' | 'APEL' | 'MANUAL' | 'PRAKTIKUM';
    sumberId: number;
    statusKonfirmasi: 'SAKIT' | 'IZIN' | 'ALPA' | 'HADIR';
    durasiMenit?: number;
    keterangan?: string;
  }): Promise<Record<string, unknown>> {
    return fetchApi<Record<string, unknown>>('/ketidakhadiran/verifikasi-unknown', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Rekap Kehadiran
  async getRekapKehadiran(kelasKuliahId: number): Promise<RekapKehadiranKelasResponse> {
    return fetchApi<RekapKehadiranKelasResponse>(`/presensi/rekap-kehadiran?kelasKuliahId=${kelasKuliahId}`);
  },

  async getRekapKehadiranMahasiswa(mahasiswaId: number, periodeId?: string): Promise<Record<string, unknown>> {
    const params = new URLSearchParams({ mahasiswaId: String(mahasiswaId) });
    if (periodeId) params.append('periodeId', periodeId);
    return fetchApi<Record<string, unknown>>(`/presensi/rekap-kehadiran-mahasiswa?${params.toString()}`);
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
    sortBy?: string,
    sortOrder?: string,
    statusLunas?: string,
    exportAll?: boolean,
  ): Promise<PaginatedResponse<KompensasiLaporanItem>> {
    const params = new URLSearchParams();
    if (page) params.append('page', String(page));
    if (limit) params.append('limit', String(limit));
    if (search) params.append('search', search);
    if (prodiId) params.append('prodiId', String(prodiId));
    if (sortBy) params.append('sortBy', sortBy);
    if (sortOrder) params.append('sortOrder', sortOrder);
    if (statusLunas) params.append('statusLunas', statusLunas);
    if (exportAll) params.append('exportAll', 'true');
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

  async getMonitoringRps(periodeId?: number, prodiId?: number): Promise<MonitoringRpsItem[]> {
    const params = new URLSearchParams();
    if (periodeId) params.append('periodeId', String(periodeId));
    if (prodiId) params.append('prodiId', String(prodiId));
    const queryStr = params.toString() ? `?${params.toString()}` : '';
    return fetchApi<MonitoringRpsItem[]>(`/bap/monitoring-rps${queryStr}`);
  },

  async getMonitoringRpsDetail(kelasKuliahId: number): Promise<MonitoringRpsDetailResponse> {
    return fetchApi<MonitoringRpsDetailResponse>(`/bap/monitoring-rps/kelas/${kelasKuliahId}`);
  },
};

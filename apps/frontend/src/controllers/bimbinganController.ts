import { fetchApi } from '../utils/api';

export interface BimbinganThread {
  id: number;
  bimbinganId: number;
  senderRole: 'mahasiswa' | 'dosen' | 'admin';
  pesan: string;
  tipe: string;
  createdAt: string;
}

export interface SesiBimbingan {
  id: number;
  bimbinganId: number;
  pertemuanKe: number;
  tanggalBimbingan: string;
  permasalahan: string;
  solusi: string;
  statusBkd: boolean;
  kategoriId?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Bimbingan {
  id: number;
  mahasiswaId: number;
  dosenId: number | null;
  periodeId: string;
  ringkasan: string | null;
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
  thread: BimbinganThread[];
  sesi: SesiBimbingan[];
  availablePeriodes?: string[];
}

export interface BimbinganMonitoring {
  id: number;
  nim: string;
  nama: string;
  angkatan?: string;
  prodiId?: number;
  prodiNama?: string;
  dosenPaId: number | null;
  dosenPaNama: string | null;
  bimbinganId: number | null;
  ringkasan: string | null;
  isApproved: boolean;
  totalSesi?: number;
  createdAt: string | null;
}

export interface MonitoringBimbinganLengkapItem {
  mahasiswaId: number;
  nim: string;
  namaMahasiswa: string;
  prodiId: number | null;
  dosenPaId: number | null;
  dosenPaNama: string;
  periodeId: string;
  bimbinganId: number | null;
  totalSesi: number;
  isApproved: boolean;
  statusBkd: boolean;
  sesiList: SesiBimbingan[];
}

export interface Pelanggaran {
  id: number;
  mahasiswaId: number;
  nim?: string;
  namaMahasiswa?: string;
  prodiNama?: string;
  tanggal: string;
  jenisPelanggaran: string;
  bobotPoin: number;
  keterangan: string;
  dibuatOleh?: number | null;
  createdAt?: string;
}

export interface PelanggaranRekap {
  pelanggaranList: Pelanggaran[];
  totalPoin: number;
}

export const bimbinganController = {
  async getByMhsId(mhsId: number, periodeId?: string): Promise<Bimbingan> {
    const query = periodeId ? `?periodeId=${periodeId}` : '';
    return fetchApi<Bimbingan>(`/bimbingan/mahasiswa/${mhsId}${query}`);
  },

  async sendThread(mhsId: number, pesan: string, tipe?: string): Promise<BimbinganThread> {
    return fetchApi<BimbinganThread>(`/bimbingan/mahasiswa/${mhsId}/thread`, {
      method: 'POST',
      body: JSON.stringify({ pesan, tipe }),
    });
  },

  async updateBimbingan(
    mhsId: number,
    data: {
      ringkasan?: string;
      isApproved?: boolean;
      permasalahan?: string;
      solusi?: string;
      tanggalBimbingan?: string;
      statusBkd?: boolean;
    },
  ): Promise<Bimbingan> {
    return fetchApi<Bimbingan>(`/bimbingan/mahasiswa/${mhsId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async getMonitoring(): Promise<BimbinganMonitoring[]> {
    return fetchApi<BimbinganMonitoring[]>('/bimbingan/monitoring');
  },

  async getRekapBkd(
    dosenId?: number,
    periodeId?: string,
  ): Promise<{ data: (Bimbingan & { mahasiswa: { nim: string; nama: string } })[] }> {
    const params = new URLSearchParams();
    if (dosenId) params.append('dosenId', String(dosenId));
    if (periodeId) params.append('periodeId', periodeId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchApi<{ data: (Bimbingan & { mahasiswa: { nim: string; nama: string } })[] }>(
      `/bimbingan/rekap-bkd${query}`,
    );
  },

  async getAkademikSummary(
    mhsId: number,
  ): Promise<{ sisaKompensasi: number; poinPelanggaran: number; ipk: number; ipsSemesterLalu: number }> {
    return fetchApi<{ sisaKompensasi: number; poinPelanggaran: number; ipk: number; ipsSemesterLalu: number }>(
      `/bimbingan/mahasiswa/${mhsId}/akademik-summary`,
    );
  },

  async addSesi(
    mhsId: number,
    data: {
      pertemuanKe: number;
      tanggalBimbingan: string;
      permasalahan: string;
      solusi: string;
      statusBkd?: boolean;
      kategoriId?: number | null;
    },
  ): Promise<SesiBimbingan> {
    return fetchApi<SesiBimbingan>(`/bimbingan/mahasiswa/${mhsId}/sesi`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateSesi(
    sesiId: number,
    data: {
      pertemuanKe?: number;
      tanggalBimbingan?: string;
      permasalahan?: string;
      solusi?: string;
      statusBkd?: boolean;
      kategoriId?: number | null;
    },
  ): Promise<SesiBimbingan> {
    return fetchApi<SesiBimbingan>(`/bimbingan/sesi/${sesiId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteSesi(sesiId: number): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/bimbingan/sesi/${sesiId}`, {
      method: 'DELETE',
    });
  },

  async clearChatThread(mhsId: number): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/bimbingan/mahasiswa/${mhsId}/thread`, {
      method: 'DELETE',
    });
  },

  async createPelanggaran(data: Omit<Pelanggaran, 'id'>): Promise<Pelanggaran> {
    return fetchApi<Pelanggaran>('/pelanggaran', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getPelanggaranByMhsId(mhsId: number): Promise<PelanggaranRekap> {
    return fetchApi<PelanggaranRekap>(`/pelanggaran/mahasiswa/${mhsId}`);
  },

  async getAllPelanggaran(): Promise<Pelanggaran[]> {
    return fetchApi<Pelanggaran[]>('/pelanggaran');
  },

  async updatePelanggaran(id: number, data: Partial<Omit<Pelanggaran, 'id'>>): Promise<Pelanggaran> {
    return fetchApi<Pelanggaran>(`/pelanggaran/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async getMonitoringLengkap(filter?: {
    periodeId?: string;
    prodiId?: number;
    dosenPaId?: number;
  }): Promise<MonitoringBimbinganLengkapItem[]> {
    const params = new URLSearchParams();
    if (filter?.periodeId) params.append('periodeId', filter.periodeId);
    if (filter?.prodiId) params.append('prodiId', String(filter.prodiId));
    if (filter?.dosenPaId) params.append('dosenPaId', String(filter.dosenPaId));
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await fetchApi<{ data: MonitoringBimbinganLengkapItem[] }>(`/bimbingan/monitoring-lengkap${query}`);
    return res.data || [];
  },
};

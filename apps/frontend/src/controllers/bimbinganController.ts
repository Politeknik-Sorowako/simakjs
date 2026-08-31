import { fetchApi } from '../utils/api';
import { PaginatedResponse } from './prodiController';

export interface BimbinganAttachment {
  id: number;
  bimbinganId: number;
  bimbinganThreadId?: number | null;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedBy?: number | null;
  createdAt: string;
}

export interface BimbinganThread {
  id: number;
  bimbinganId: number;
  senderRole: 'mahasiswa' | 'dosen' | 'admin' | 'prodi';
  pesan: string;
  tipe: string;
  isReadByMahasiswa?: boolean;
  readAtMahasiswa?: string | null;
  createdAt: string;
}

export interface SesiBimbingan {
  id: number;
  bimbinganId: number;
  pertemuanKe: number;
  tanggalBimbingan: string;
  topikBimbingan?: string;
  permasalahan?: string;
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
  topikBimbingan?: string | null;
  permasalahan?: string | null;
  kategori?: string;
  isReadByMahasiswa?: boolean;
  readAtMahasiswa?: string | null;
  createdAt: string;
  updatedAt: string;
  thread: BimbinganThread[];
  sesi: SesiBimbingan[];
  attachments?: BimbinganAttachment[];
  availablePeriodes?: string[];
}

export interface BimbinganMonitoring {
  id: number;
  nim: string;
  nama: string;
  foto?: string | null;
  angkatan?: string;
  prodiId?: number;
  prodiNama?: string;
  dosenPaId: number | null;
  dosenPaNama: string | null;
  bimbinganId: number | null;
  ringkasan: string | null;
  isApproved: boolean;
  totalSesi?: number;
  topikBimbingan?: string | null;
  permasalahan?: string | null;
  kategori?: string;
  isReadByMahasiswa?: boolean;
  readAtMahasiswa?: string | null;
  createdAt: string | null;
}

export interface MonitoringBimbinganLengkapItem {
  mahasiswaId: number;
  nim: string;
  namaMahasiswa: string;
  foto?: string | null;
  prodiId: number | null;
  dosenPaId: number | null;
  dosenPaNama: string;
  periodeId: string;
  bimbinganId: number | null;
  totalSesi: number;
  isApproved: boolean;
  statusBkd: boolean;
  kategori?: string;
  isReadByMahasiswa?: boolean;
  readAtMahasiswa?: string | null;
  topikBimbingan?: string | null;
  permasalahan?: string | null;
  sesiList: SesiBimbingan[];
}

export interface Pelanggaran {
  id: number;
  mahasiswaId: number;
  nim?: string;
  namaMahasiswa?: string;
  foto?: string | null;
  prodiNama?: string;
  programStudiId?: number;
  jenjang?: string;
  dosenPaId?: number | null;
  tanggal: string;
  jenisPelanggaran: string;
  bobotPoin?: number;
  keterangan: string;
  pasalId?: number | null;
  jenisSanksi?: number;
  pelapor?: string | null;
  nomorPasal?: string | null;
  bunyiPasal?: string | null;
  dibuatOleh?: number | null;
  createdAt?: string;
}

export interface PelanggaranRekap {
  pelanggaranList: Pelanggaran[];
  totalPoin: number;
  predikat: string;
  degradasiNilaiSikap?: number;
}

export interface RekapPelanggaran {
  totalPelanggaran: number;
  totalMahasiswa: number;
  perJenis: { jenis: string; jumlah: number; totalPoin: number }[];
  perProdi: { prodiId: number | null; prodiNama: string; totalPelanggaran: number; totalPoin: number }[];
  topPelanggar: {
    mahasiswaId: number;
    nim: string;
    nama: string;
    foto?: string | null;
    prodiNama: string;
    totalPoin: number;
    jumlahPelanggaran: number;
    predikat: string;
    degradasiNilaiSikap?: number;
  }[];
}

export const bimbinganController = {
  async getByMhsId(mhsId: number, periodeId?: string, kategori?: string): Promise<Bimbingan> {
    const params = new URLSearchParams();
    if (periodeId) params.append('periodeId', periodeId);
    if (kategori) params.append('kategori', kategori);
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchApi<Bimbingan>(`/bimbingan/mahasiswa/${mhsId}${query}`);
  },

  async sendThread(mhsId: number, pesan: string, tipe?: string): Promise<BimbinganThread> {
    return fetchApi<BimbinganThread>(`/bimbingan/mahasiswa/${mhsId}/thread`, {
      method: 'POST',
      body: JSON.stringify({ pesan, tipe }),
    });
  },

  async markAsRead(mhsId: number): Promise<{ success: boolean; readAt: string }> {
    return fetchApi<{ success: boolean; readAt: string }>(`/bimbingan/mahasiswa/${mhsId}/read`, {
      method: 'POST',
    });
  },

  async updateBimbingan(
    mhsId: number,
    data: {
      ringkasan?: string;
      isApproved?: boolean;
      topikBimbingan?: string;
      permasalahan?: string;
      solusi?: string;
      tanggalBimbingan?: string;
      statusBkd?: boolean;
      kategori?: string;
    },
  ): Promise<Bimbingan> {
    return fetchApi<Bimbingan>(`/bimbingan/mahasiswa/${mhsId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async getMonitoring(kategori?: string): Promise<BimbinganMonitoring[]> {
    const query = kategori ? `?kategori=${kategori}` : '';
    return fetchApi<BimbinganMonitoring[]>(`/bimbingan/monitoring${query}`);
  },

  async getRekapBkd(
    dosenId?: number,
    periodeId?: string,
    kategori?: string,
  ): Promise<{ data: (Bimbingan & { mahasiswa: { nim: string; nama: string } })[] }> {
    const params = new URLSearchParams();
    if (dosenId) params.append('dosenId', String(dosenId));
    if (periodeId) params.append('periodeId', periodeId);
    if (kategori) params.append('kategori', kategori);
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchApi<{ data: (Bimbingan & { mahasiswa: { nim: string; nama: string } })[] }>(
      `/bimbingan/rekap-bkd${query}`,
    );
  },

  async getAkademikSummary(mhsId: number): Promise<{
    sisaKompensasi: number;
    poinPelanggaran: number;
    pelanggaranPredikat?: string;
    degradasiNilaiSikap?: number;
    ipk: number;
    ipsSemesterLalu: number;
  }> {
    return fetchApi<{
      sisaKompensasi: number;
      poinPelanggaran: number;
      pelanggaranPredikat?: string;
      degradasiNilaiSikap?: number;
      ipk: number;
      ipsSemesterLalu: number;
    }>(`/bimbingan/mahasiswa/${mhsId}/akademik-summary`);
  },

  async addSesi(
    mhsId: number,
    data: {
      pertemuanKe: number;
      tanggalBimbingan: string;
      topikBimbingan?: string;
      permasalahan?: string;
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
      topikBimbingan?: string;
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

  async createPelanggaran(
    data: Omit<Pelanggaran, 'id' | 'bobotPoin'> & { jenisPelanggaran?: string },
  ): Promise<Pelanggaran> {
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

  async getRekapPelanggaran(programStudiId?: number): Promise<RekapPelanggaran> {
    const params = new URLSearchParams();
    if (programStudiId) params.append('programStudiId', String(programStudiId));
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchApi<RekapPelanggaran>(`/pelanggaran/rekap${query}`);
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
    kategori?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<MonitoringBimbinganLengkapItem>> {
    const params = new URLSearchParams();
    if (filter?.periodeId) params.append('periodeId', filter.periodeId);
    if (filter?.prodiId) params.append('prodiId', String(filter.prodiId));
    if (filter?.dosenPaId) params.append('dosenPaId', String(filter.dosenPaId));
    if (filter?.kategori) params.append('kategori', filter.kategori);
    if (filter?.search) params.append('search', filter.search);
    if (filter?.page) params.append('page', String(filter.page));
    if (filter?.limit) params.append('limit', String(filter.limit));
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await fetchApi<PaginatedResponse<MonitoringBimbinganLengkapItem>>(
      `/bimbingan/monitoring-lengkap${query}`,
    );
    return res;
  },
};

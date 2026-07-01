import { fetchApi } from '../utils/api';

export interface BimbinganThread {
  id: number;
  bimbinganId: number;
  senderRole: 'mahasiswa' | 'dosen' | 'admin';
  pesan: string;
  tipe: string;
  createdAt: string;
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
  availablePeriodes?: string[];
}

export interface BimbinganMonitoring {
  id: number;
  nim: string;
  nama: string;
  dosenPaId: number | null;
  dosenPaNama: string | null;
  bimbinganId: number | null;
  ringkasan: string | null;
  isApproved: boolean;
  createdAt: string | null;
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

  async updateBimbingan(mhsId: number, data: { ringkasan?: string; isApproved?: boolean }): Promise<Bimbingan> {
    return fetchApi<Bimbingan>(`/bimbingan/mahasiswa/${mhsId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async getMonitoring(): Promise<BimbinganMonitoring[]> {
    return fetchApi<BimbinganMonitoring[]>('/bimbingan/monitoring');
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
};

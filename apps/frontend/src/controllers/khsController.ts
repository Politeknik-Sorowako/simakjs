import { fetchApi } from '../utils/api';

export interface KhsResponse {
  blocked: boolean;
  reason?: string;
  detail?: string;
  krsList?: any[];
  summary?: {
    totalSks: number;
    ipSemester: number;
    ipk: number;
    totalSksKumulatif: number;
  };
}

export interface TranskripResponse {
  transkripList: any[];
  summary: {
    totalSks: number;
    ipk: number;
  };
}

export interface PengajuanYudisium {
  id?: number;
  mahasiswaId: number;
  bebasPerpustakaan: boolean;
  bebasLab: boolean;
  buktiPembayaranWisuda: boolean;
  skorToefl: number;
  judulTa: string;
  status: 'diajukan' | 'diverifikasi' | 'disetujui' | 'ditolak';
  catatan?: string | null;
  createdAt?: string;
  mahasiswa?: {
    nim: string;
    nama: string;
    status: string;
  };
  prodi?: {
    nama: string;
  };
}

export interface KomponenNilai {
  id?: number;
  kelasKuliahId: number;
  nama: string;
  bobot: number;
}

export interface NilaiMahasiswa {
  krsId: number;
  mahasiswaId: number;
  nim: string;
  nama: string;
  nilaiAngka: string | null;
  nilaiHuruf: string | null;
  nilaiIndeks: string | null;
  nilaiKomponen: Array<{
    id: number;
    komponenNilaiId: number;
    nilai: string;
  }>;
}

export const khsController = {
  async getByMhsIdAndPeriode(mhsId: number, periodeId: string): Promise<KhsResponse> {
    return fetchApi<KhsResponse>(`/khs/mahasiswa/${mhsId}/periode/${periodeId}`);
  },

  async getTranskrip(mhsId: number): Promise<TranskripResponse> {
    return fetchApi<TranskripResponse>(`/khs/mahasiswa/${mhsId}/transkrip`);
  },

  async getPengajuanYudisium(mhsId: number): Promise<PengajuanYudisium | null> {
    return fetchApi<PengajuanYudisium | null>(`/yudisium/mahasiswa/${mhsId}`);
  },

  async submitPengajuanYudisium(mhsId: number, data: Omit<PengajuanYudisium, 'mahasiswaId' | 'status'>): Promise<PengajuanYudisium> {
    return fetchApi<PengajuanYudisium>(`/yudisium/mahasiswa/${mhsId}`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateYudisiumStatus(mhsId: number, data: { status: string; catatan?: string }): Promise<PengajuanYudisium> {
    return fetchApi<PengajuanYudisium>(`/yudisium/mahasiswa/${mhsId}/status`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async getAllYudisium(): Promise<PengajuanYudisium[]> {
    return fetchApi<PengajuanYudisium[]>('/yudisium');
  },

  async getKomponen(kelasKuliahId: number): Promise<KomponenNilai[]> {
    return fetchApi<KomponenNilai[]>(`/yudisium/kelas/${kelasKuliahId}/komponen`);
  },

  async saveKomponen(kelasKuliahId: number, komponenList: Omit<KomponenNilai, 'id' | 'kelasKuliahId'>[]): Promise<KomponenNilai[]> {
    return fetchApi<KomponenNilai[]>('/yudisium/kelas/komponen', {
      method: 'POST',
      body: JSON.stringify({ kelasKuliahId, komponenList })
    });
  },

  async getNilaiMahasiswa(kelasKuliahId: number): Promise<NilaiMahasiswa[]> {
    return fetchApi<NilaiMahasiswa[]>(`/yudisium/kelas/${kelasKuliahId}/nilai`);
  },

  async saveNilaiMahasiswa(kelasKuliahId: number, nilaiList: Array<{
    krsId: number;
    nilaiKomponenList: Array<{ komponenNilaiId: number; nilai: number }>
  }>): Promise<any> {
    return fetchApi<any>('/yudisium/kelas/nilai', {
      method: 'POST',
      body: JSON.stringify({ kelasKuliahId, nilaiList })
    });
  }
};

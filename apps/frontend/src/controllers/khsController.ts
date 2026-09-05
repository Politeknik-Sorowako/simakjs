import { fetchApi } from '../utils/api';

export interface KhsKrsItem {
  id: number;
  nilaiAngka: string | null;
  nilaiHuruf: string | null;
  nilaiIndeks: string | null;
  isApproved: boolean;
  kelasKuliah: { id: number; namaKelas: string };
  mataKuliah: { id: number; kode: string; nama: string; sksTotal: number };
}

export interface TranskripItem {
  id: number;
  nilaiAngka: string | null;
  nilaiHuruf: string | null;
  nilaiIndeks: string | null;
  periodeId: string;
  semester?: number;
  ips?: string | null;
  mataKuliah: { kode: string; nama: string; sksTotal: number };
}

export interface KonversiNilai {
  id?: number;
  programStudiId: number | null;
  programStudi?: { nama: string };
  nilaiHuruf: string;
  bobotIndeks: number | string;
  nilaiMin: number | string;
  nilaiMax: number | string;
  predikat: string;
}

export interface PredikatKelulusan {
  id: number;
  predikat: string;
  ipkMin: number;
  ipkMax: number;
  keterangan?: string;
}

export interface KhsResponse {
  blocked: boolean;
  reason?: string;
  detail?: string;
  krsList?: KhsKrsItem[];
  summary?: {
    totalSks: number;
    ipSemester: number;
    ipk: number;
    totalSksKumulatif: number;
  };
}

export interface TranskripResponse {
  transkripList: TranskripItem[];
  summary?: {
    totalSks: number;
    ipk: number;
  };
  ipk?: number;
  totalSksLulus?: number;
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
  subCpmkId?: number | null;
  rencanaEvaluasiId?: number | null;
}

export interface NilaiMahasiswa {
  krsId: number;
  mahasiswaId: number;
  nim: string;
  nama: string;
  foto?: string | null;
  nilaiAngka: string | null;
  nilaiHuruf: string | null;
  nilaiIndeks: string | null;
  nilaiKomponen: Array<{
    id: number;
    komponenNilaiId: number;
    nilai: string;
  }>;
}

export interface RekapPerProdi {
  periode: { id: string } | null;
  prodi: { prodiId: number; prodiNama: string; totalMahasiswa: number; rataIP: number }[];
}

export interface RekapNilai {
  mahasiswa: { id: number; nim: string; nama: string; prodi: string };
  periode: { id: string } | null;
  mataKuliah: {
    krsId: number;
    mataKuliahId: number;
    kodeMk: string;
    namaMk: string;
    sks: number;
    nilaiAngka: string | null;
    nilaiHuruf: string | null;
    nilaiIndeks: string | null;
    isApproved: boolean;
  }[];
  summary: { totalSks: number; ip: number; totalMk: number };
}

export interface YudisiumStats {
  totalPengajuan: number;
  statusBreakdown: Record<string, number>;
  perProdi: { prodiId: number; prodiNama: string; total: number }[];
}

export interface MahasiswaKeluarStats {
  total: number;
  perStatus: { status: string; jumlah: number }[];
  perProdi: { prodiId: number; prodiNama: string; total: number }[];
}

export const khsController = {
  async getByMhsIdAndPeriode(mhsId: number, periodeId: string): Promise<KhsResponse> {
    return fetchApi<KhsResponse>(`/khs/mahasiswa/${mhsId}/periode/${periodeId}`);
  },

  async getTranskrip(mhsId: number): Promise<TranskripResponse> {
    return fetchApi<TranskripResponse>(`/khs/mahasiswa/${mhsId}/transkrip`);
  },

  async getPengajuanYudisium(mhsId: number): Promise<PengajuanYudisium | null> {
    try {
      return await fetchApi<PengajuanYudisium | null>(`/yudisium/mahasiswa/${mhsId}`);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      if (message.includes('tidak ditemukan') || message.includes('Not Found')) {
        return null;
      }
      throw e;
    }
  },

  async submitPengajuanYudisium(
    mhsId: number,
    data: Omit<PengajuanYudisium, 'mahasiswaId' | 'status'>,
  ): Promise<PengajuanYudisium> {
    return fetchApi<PengajuanYudisium>(`/yudisium/mahasiswa/${mhsId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateYudisiumStatus(mhsId: number, data: { status: string; catatan?: string }): Promise<PengajuanYudisium> {
    return fetchApi<PengajuanYudisium>(`/yudisium/mahasiswa/${mhsId}/status`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async getAllYudisium(): Promise<PengajuanYudisium[]> {
    return fetchApi<PengajuanYudisium[]>('/yudisium');
  },

  async getKomponen(kelasKuliahId: number): Promise<KomponenNilai[]> {
    return fetchApi<KomponenNilai[]>(`/yudisium/kelas/${kelasKuliahId}/komponen`);
  },

  async saveKomponen(
    kelasKuliahId: number,
    komponenList: Omit<KomponenNilai, 'id' | 'kelasKuliahId'>[],
  ): Promise<KomponenNilai[]> {
    return fetchApi<KomponenNilai[]>('/yudisium/kelas/komponen', {
      method: 'POST',
      body: JSON.stringify({ kelasKuliahId, komponenList }),
    });
  },

  async getNilaiMahasiswa(kelasKuliahId: number): Promise<NilaiMahasiswa[]> {
    return fetchApi<NilaiMahasiswa[]>(`/yudisium/kelas/${kelasKuliahId}/nilai`);
  },

  async saveNilaiMahasiswa(
    kelasKuliahId: number,
    nilaiList: Array<{
      krsId: number;
      nilaiKomponenList: Array<{ komponenNilaiId: number; nilai: number }>;
    }>,
  ): Promise<{ message: string }> {
    return fetchApi<{ message: string }>('/yudisium/kelas/nilai', {
      method: 'POST',
      body: JSON.stringify({ kelasKuliahId, nilaiList }),
    });
  },

  async getExamEligibility(
    mhsId: number,
    periodeId: string,
  ): Promise<{
    bimbingan: { eligible: boolean };
    classes: {
      mataKuliahKode: string;
      mataKuliahNama: string;
      namaKelas: string;
      attendanceRate: number;
      presentMeetings: number;
      totalMeetings: number;
      eligible: boolean;
    }[];
  }> {
    return fetchApi(`/khs/mahasiswa/${mhsId}/periode/${periodeId}/eligibility`);
  },

  async lockKelas(kelasKuliahId: number): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/yudisium/kelas/${kelasKuliahId}/lock`, {
      method: 'POST',
    });
  },

  async unlockKelas(kelasKuliahId: number): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/yudisium/kelas/${kelasKuliahId}/unlock`, {
      method: 'POST',
    });
  },

  async getPddiktiStats(): Promise<{
    mahasiswa: { total: number; synced: number; unsynced: number };
    kelasKuliah: { total: number; synced: number; unsynced: number };
    krs: { total: number; synced: number; unsynced: number };
  }> {
    return fetchApi('/pddikti/stats');
  },

  async syncPddikti(): Promise<{
    message: string;
    details: {
      prodiSynced: number;
      mataKuliahSynced: number;
      mahasiswaSynced: number;
      kelasSynced: number;
      krsSynced: number;
    };
  }> {
    return fetchApi('/pddikti/sync', {
      method: 'POST',
    });
  },

  // --- LAPORAN ---
  async getRekapNilai(mahasiswaId: number, periodeId?: string) {
    const url = periodeId
      ? `/khs/rekap-nilai/${mahasiswaId}?periodeId=${periodeId}`
      : `/khs/rekap-nilai/${mahasiswaId}`;
    return fetchApi<RekapNilai>(url);
  },

  async getRekapPerProdi(periodeId?: string) {
    const url = periodeId ? `/khs/rekap-per-prodi?periodeId=${periodeId}` : '/khs/rekap-per-prodi';
    return fetchApi<RekapPerProdi>(url);
  },

  async getMatriksNilaiMK(periodeId?: string, prodiId?: number, search?: string, page = 1, limit = 20) {
    const params = new URLSearchParams();
    if (periodeId) params.append('periodeId', periodeId);
    if (prodiId) params.append('prodiId', String(prodiId));
    if (search) params.append('search', search);
    params.append('page', String(page));
    params.append('limit', String(limit));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return fetchApi<
      | Array<{
          mataKuliahId: number;
          kodeMk: string;
          namaMk: string;
          sks: number;
          prodiId?: number | null;
          prodiNama: string;
          totalPeserta: number;
          gradeA: number;
          gradeB: number;
          gradeC: number;
          gradeD: number;
          gradeE: number;
          gradeNull: number;
          persenLulus: number;
        }>
      | {
          data: Array<{
            mataKuliahId: number;
            kodeMk: string;
            namaMk: string;
            sks: number;
            prodiId?: number | null;
            prodiNama: string;
            totalPeserta: number;
            gradeA: number;
            gradeB: number;
            gradeC: number;
            gradeD: number;
            gradeE: number;
            gradeNull: number;
            persenLulus: number;
          }>;
          pagination: { total: number; page: number; limit: number; totalPages: number };
        }
    >(`/khs/matriks-nilai${qs}`);
  },

  async getDetailNilaiMK(mataKuliahId: number, periodeId?: string) {
    const qs = periodeId ? `?periodeId=${periodeId}` : '';
    return fetchApi<{
      mataKuliah: { id: number; kode: string; nama: string; sksTotal: number; prodiNama: string };
      dosenPengampu: string[];
      bapList: Array<{
        id: number;
        pertemuanKe: number;
        tanggal: string;
        materi: string;
        durasiMenit: number;
        dosenNama: string;
      }>;
      peserta: Array<{
        mahasiswaId: number;
        nim: string;
        nama: string;
        nilaiAngka: string | null;
        nilaiHuruf: string | null;
        nilaiIndeks: string | null;
      }>;
    }>(`/khs/mata-kuliah/${mataKuliahId}/detail-nilai${qs}`);
  },

  async getYudisiumStats(periodeId?: string) {
    const qs = periodeId ? `?periodeId=${periodeId}` : '';
    return fetchApi<YudisiumStats>(`/yudisium/stats${qs}`);
  },

  async getMahasiswaKeluarStats(periodeId?: string) {
    const qs = periodeId ? `?periodeId=${periodeId}` : '';
    return fetchApi<MahasiswaKeluarStats>(`/mahasiswa-keluar/stats${qs}`);
  },

  // --- KONVERSI NILAI ---
  async getAllKonversi(programStudiId?: number): Promise<KonversiNilai[]> {
    const url = programStudiId ? `/khs/konversi?programStudiId=${programStudiId}` : '/khs/konversi';
    return fetchApi<KonversiNilai[]>(url);
  },

  async saveKonversi(data: KonversiNilai): Promise<KonversiNilai> {
    return fetchApi<KonversiNilai>('/khs/konversi', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteKonversi(id: number): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/khs/konversi/${id}`, {
      method: 'DELETE',
    });
  },

  // --- SKALA PREDIKAT KELULUSAN ---
  async getAllPredikat(): Promise<PredikatKelulusan[]> {
    return fetchApi<PredikatKelulusan[]>('/khs/predikat');
  },

  async savePredikat(data: PredikatKelulusan): Promise<PredikatKelulusan> {
    return fetchApi<PredikatKelulusan>('/khs/predikat', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deletePredikat(id: number): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/khs/predikat/${id}`, {
      method: 'DELETE',
    });
  },
};

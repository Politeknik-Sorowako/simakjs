import { fetchApi } from '../utils/api';
import { PaginatedResponse } from './prodiController';

export interface KelompokApel {
  id: number;
  namaKelompok: string;
  dosenId?: number | null;
  dosenNama?: string | null;
  shift?: string;
  keterangan?: string;
  isActive: boolean;
  jumlahAnggota: number;
}

export interface KelompokApelDetail extends KelompokApel {
  anggota: Array<{
    id: number;
    mahasiswaId: number;
    nim: string;
    nama: string;
  }>;
}

export interface SesiApel {
  id: number;
  kelompokApelId: number;
  kelompokNama?: string;
  tanggal: string;
  shift: string;
  dosenId: number;
  dosenNama: string;
  jamMulai: string;
  catatan?: string | null;
  isClosed: boolean;
  closedAt?: string;
  createdAt?: string;
  jumlahMahasiswa?: number;
  hadirCount?: number;
  terlambatCount?: number;
  unknownCount?: number;
}

export interface PresensiApelItem {
  id: number;
  sesiApelId: number;
  mahasiswaId: number;
  mahasiswaNim: string;
  mahasiswaNama: string;
  status: 'hadir' | 'terlambat' | 'sakit' | 'izin' | 'alpa' | 'unknown';
  menitTerlambat?: number;
  keterangan?: string | null;
  verifiedStatus?: string;
  verifiedAt?: string;
  verificationNote?: string;
}

export interface SesiPresensiResponse {
  sesi: SesiApel;
  presensi: PresensiApelItem[];
}

export interface UnknownPresensiItem {
  id: number;
  sesiApelId: number;
  mahasiswaId: number;
  mahasiswaNim: string;
  mahasiswaNama: string;
  mahasiswaProdiId: number;
  prodiNama: string;
  tanggal: string;
  shift: string;
  kelompokNama: string;
  dosenNama: string;
  createdAt: string;
  menitTerlambat?: number | null;
  verifiedStatus?: string | null;
  verifiedAt?: string | null;
  verifiedBy?: number | null;
}

export interface MonitorResponse {
  summary: {
    totalSesiAktif: number;
    totalHadir: number;
    totalTerlambat: number;
    totalUnknown: number;
  };
  detail: Array<{
    id: number;
    kelompokApelId: number;
    kelompokNama: string;
    tanggal: string;
    shift: string;
    dosenId: number;
    dosenNama: string;
    jamMulai: string;
    totalMahasiswa: number;
    hadir: number;
    terlambat: number;
    unknown: number;
  }>;
}

export const apelController = {
  createKelompok: (data: { namaKelompok: string; dosenId?: number | null; shift?: string; keterangan?: string }) =>
    fetchApi<KelompokApel>('/apel/kelompok', { method: 'POST', body: JSON.stringify(data) }),

  updateKelompok: (
    id: number,
    data: { namaKelompok?: string; dosenId?: number; shift?: string; keterangan?: string; isActive?: boolean },
  ) => fetchApi(`/apel/kelompok/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteKelompok: (id: number) => fetchApi(`/apel/kelompok/${id}`, { method: 'DELETE' }),

  getKelompokByProdi: (_prodiId?: number, dosenId?: number) => {
    const params = new URLSearchParams();
    if (dosenId) params.set('dosenId', String(dosenId));
    const qs = params.toString();
    return fetchApi<KelompokApel[]>(`/apel/kelompok${qs ? `?${qs}` : ''}`);
  },

  getKelompokDetail: (id: number) => fetchApi<KelompokApelDetail>(`/apel/kelompok/${id}`),

  manageAnggota: (kelompokId: number, mahasiswaIds: number[]) =>
    fetchApi<{ added: number; skipped: number }>(`/apel/kelompok/${kelompokId}/anggota`, {
      method: 'POST',
      body: JSON.stringify({ mahasiswaIds }),
    }),

  removeAnggota: (kelompokId: number, mahasiswaId: number) =>
    fetchApi(`/apel/kelompok/${kelompokId}/anggota/${mahasiswaId}`, { method: 'DELETE' }),

  bukaSesi: (data: {
    kelompokApelId: number;
    tanggal: string;
    shift: string;
    jamMulai: string;
    dosenId?: number;
    catatan?: string;
  }) =>
    fetchApi<SesiApel & { jumlahAnggota: number }>('/apel/sesi/buka', { method: 'POST', body: JSON.stringify(data) }),

  submitPresensi: (
    sesiId: number,
    presensiList: Array<{ mahasiswaId: number; status: string; menitTerlambat?: number; keterangan?: string | null }>,
  ) => fetchApi(`/apel/sesi/${sesiId}/presensi`, { method: 'POST', body: JSON.stringify({ presensiList }) }),

  getSesiPresensi: (sesiId: number) => fetchApi<SesiPresensiResponse>(`/apel/sesi/${sesiId}/presensi`),

  getSesiByKelompok: (kelompokId: number) => fetchApi<SesiApel[]>(`/apel/sesi/kelompok/${kelompokId}`),

  tutupSesi: (sesiId: number) => fetchApi(`/apel/sesi/${sesiId}/tutup`, { method: 'POST' }),

  bukaKembaliSesi: (sesiId: number) => fetchApi(`/apel/sesi/${sesiId}/buka-kembali`, { method: 'POST' }),

  deleteSesi: (sesiId: number) => fetchApi(`/apel/sesi/${sesiId}`, { method: 'DELETE' }),

  updateSesi: (
    sesiId: number,
    data: { tanggal?: string; shift?: string; jamMulai?: string; dosenId?: number | null },
  ) => fetchApi<SesiApel>(`/apel/sesi/${sesiId}`, { method: 'PUT', body: JSON.stringify(data) }),

  getSesiAktif: (dosenId?: number) => {
    const qs = dosenId ? `?dosenId=${dosenId}` : '';
    return fetchApi<SesiApel[]>(`/apel/sesi/aktif${qs}`);
  },

  getMonitorRealtime: (params?: { dosenId?: number; tanggal?: string }) => {
    const qs = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : '';
    return fetchApi<MonitorResponse>(`/apel/monitor${qs}`);
  },

  getPresensiUnknown: (params?: {
    page?: number;
    limit?: number;
    prodiId?: number;
    kelompokId?: number;
    tanggal?: string;
    search?: string;
    statusFilter?: 'belum' | 'sudah' | 'all';
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.prodiId) searchParams.set('prodiId', String(params.prodiId));
    if (params?.kelompokId) searchParams.set('kelompokId', String(params.kelompokId));
    if (params?.tanggal) searchParams.set('tanggal', params.tanggal);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.statusFilter && params.statusFilter !== 'all') searchParams.set('statusFilter', params.statusFilter);
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);
    const qs = searchParams.toString();
    return fetchApi<PaginatedResponse<UnknownPresensiItem>>(`/apel/verifikasi/unknown${qs ? `?${qs}` : ''}`);
  },

  verifyPresensi: (id: number, data: { verifiedStatus: string; verificationNote?: string; menitTerlambat?: number }) =>
    fetchApi(`/apel/verifikasi/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  verifikasiUnknown: (data: {
    sumber: 'BAP' | 'APEL' | 'MANUAL';
    sumberId: number;
    statusKonfirmasi: 'SAKIT' | 'IZIN' | 'ALPA';
    durasiMenit?: number;
    keterangan?: string;
  }) =>
    fetchApi('/ketidakhadiran/verifikasi-unknown', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getRekapApel: (kelompokId: number) => fetchApi(`/apel/rekap/${kelompokId}`),
};

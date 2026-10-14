import { fetchApi } from '../utils/api';
import { type PaginatedResponse } from './prodiController';

export type SkpiStatus = 'pending' | 'diverifikasi' | 'ditolak';

export interface SkpiKategori {
  id: number;
  nama: string;
  jenis: string;
  poinDefault: number;
  isAktif: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SkpiLampiran {
  id: number;
  kegiatanId: number;
  fileName: string;
  storageKey: string;
  mimeType: string;
  fileSize: number;
  keterangan?: string | null;
  uploadedById?: number | null;
  createdAt?: string;
}

export interface SkpiMahasiswaRingkas {
  id: number;
  nim: string;
  nama: string;
  programStudiId?: number | null;
  dosenPaId?: number | null;
  status?: string | null;
  angkatan?: number | null;
  programStudi?: { id: number; nama: string; jenjang?: string | null } | null;
  dosenPa?: { id: number; nama: string } | null;
}

export interface SkpiKegiatan {
  id: number;
  mahasiswaId: number;
  kategoriKegiatanId: number;
  namaKegiatan: string;
  penyelenggara?: string | null;
  tanggalMulai: string;
  tanggalSelesai?: string | null;
  lokasi?: string | null;
  deskripsi?: string | null;
  nomorSertifikat?: string | null;
  poin: number;
  status: SkpiStatus;
  catatanVerifikator?: string | null;
  verifiedById?: number | null;
  verifiedAt?: string | null;
  createdById?: number | null;
  createdAt?: string;
  updatedAt?: string;
  mahasiswa?: SkpiMahasiswaRingkas | null;
  kategori?: SkpiKategori | null;
  verifiedBy?: { id: number; nama: string } | null;
  lampiran?: SkpiLampiran[];
}

export interface SkpiSyarat {
  statusAkademikValid: boolean;
  minKegiatan: number;
  jumlahTerverifikasi: number;
  terpenuhi: boolean;
  alasan: string | null;
}

export interface SkpiDokumenKegiatan {
  id: number;
  namaKegiatan: string;
  penyelenggara?: string | null;
  tanggalMulai: string;
  tanggalSelesai?: string | null;
  lokasi?: string | null;
  nomorSertifikat?: string | null;
  poin: number;
  kategori?: { nama: string; jenis: string } | null;
}

export interface SkpiSignatureMeta {
  verifyUuid: string;
  verifyUrl: string;
  docHash: string;
  kid: string;
  signedAt: string;
  signerNama: string;
  signerJabatan: string | null;
}

export interface SkpiDokumen {
  mahasiswa: {
    id: number;
    nim: string;
    nama: string;
    status: string;
    programStudiId?: number | null;
    prodi?: string | null;
    jenjang?: string | null;
  };
  kegiatan: SkpiDokumenKegiatan[];
  totalKegiatan: number;
  totalPoin: number;
  syarat: SkpiSyarat;
  signature: SkpiSignatureMeta | null;
}

export interface SignSkpiResult extends SkpiSignatureMeta {
  /** QR hanya disertakan endpoint sign; GET dokumen tidak mengembalikannya. */
  qrDataUrl?: string;
}

export interface SkpiCreatePayload {
  kategoriKegiatanId: number;
  namaKegiatan: string;
  penyelenggara?: string | null;
  tanggalMulai: string;
  tanggalSelesai?: string | null;
  lokasi?: string | null;
  deskripsi?: string | null;
  nomorSertifikat?: string | null;
  /** Hanya untuk input oleh staf; backend mengabaikannya untuk mahasiswa pemilik. */
  mahasiswaId?: number;
}

export interface SkpiKategoriPayload {
  nama: string;
  jenis: string;
  poinDefault?: number;
  isAktif?: boolean;
}

export type SkpiKategoriUpdatePayload = Partial<SkpiKategoriPayload>;

export interface SkpiUpdatePayload {
  kategoriKegiatanId?: number;
  namaKegiatan?: string;
  penyelenggara?: string | null;
  tanggalMulai?: string;
  tanggalSelesai?: string | null;
  lokasi?: string | null;
  deskripsi?: string | null;
  nomorSertifikat?: string | null;
}

export const skpiController = {
  async getKategori(semua = false): Promise<{ data: SkpiKategori[] }> {
    const qs = semua ? '?semua=true' : '';
    return fetchApi<{ data: SkpiKategori[] }>(`/skpi/kategori${qs}`);
  },

  createKategori: (data: SkpiKategoriPayload) =>
    fetchApi<SkpiKategori>('/skpi/kategori', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateKategori: (id: number, data: SkpiKategoriUpdatePayload) =>
    fetchApi<SkpiKategori>(`/skpi/kategori/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteKategori: (id: number) =>
    fetchApi<{ message: string }>(`/skpi/kategori/${id}`, {
      method: 'DELETE',
    }),

  async getAll(params?: {
    page?: number;
    limit?: number;
    status?: string;
    kategoriId?: number;
    mahasiswaId?: number;
    prodiId?: number;
    search?: string;
  }): Promise<PaginatedResponse<SkpiKegiatan>> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.status) query.set('status', params.status);
    if (params?.kategoriId) query.set('kategoriId', String(params.kategoriId));
    if (params?.mahasiswaId) query.set('mahasiswaId', String(params.mahasiswaId));
    if (params?.prodiId) query.set('prodiId', String(params.prodiId));
    if (params?.search) query.set('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return fetchApi<PaginatedResponse<SkpiKegiatan>>(`/skpi/kegiatan${qs}`);
  },

  getById: (id: number) => fetchApi<SkpiKegiatan>(`/skpi/kegiatan/${id}`),

  create: (data: SkpiCreatePayload) =>
    fetchApi<SkpiKegiatan>('/skpi/kegiatan', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: SkpiUpdatePayload) =>
    fetchApi<SkpiKegiatan>(`/skpi/kegiatan/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  remove: (id: number) =>
    fetchApi<{ message: string }>(`/skpi/kegiatan/${id}`, {
      method: 'DELETE',
    }),

  verify: (id: number, payload: { action: 'approve' | 'reject'; catatan?: string; poin?: number }) =>
    fetchApi<SkpiKegiatan>(`/skpi/kegiatan/${id}/verifikasi`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  unverify: (id: number) =>
    fetchApi<SkpiKegiatan>(`/skpi/kegiatan/${id}/unverify`, {
      method: 'PUT',
    }),

  editHasilVerifikasi: (id: number, payload: { poin?: number; catatan?: string }) =>
    fetchApi<SkpiKegiatan>(`/skpi/kegiatan/${id}/hasil-verifikasi`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  getDokumen: (mhsId: number) => fetchApi<SkpiDokumen>(`/skpi/dokumen/${mhsId}`),

  signDokumen: (mhsId: number) => fetchApi<SignSkpiResult>(`/skpi/dokumen/${mhsId}/sign`, { method: 'POST' }),

  listLampiran: (kegiatanId: number) => fetchApi<{ data: SkpiLampiran[] }>(`/skpi/kegiatan/${kegiatanId}/lampiran`),

  uploadLampiran: (kegiatanId: number, file: File, keterangan?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (keterangan) formData.append('keterangan', keterangan);
    return fetchApi<SkpiLampiran>(`/skpi/kegiatan/${kegiatanId}/lampiran`, {
      method: 'POST',
      body: formData,
    });
  },

  deleteLampiran: (kegiatanId: number, lampiranId: number) =>
    fetchApi<{ message: string }>(`/skpi/kegiatan/${kegiatanId}/lampiran/${lampiranId}`, {
      method: 'DELETE',
    }),

  /** Buka lampiran di tab baru via object URL (pola cutiController). */
  async openLampiran(kegiatanId: number, lampiranId: number): Promise<void> {
    const { API_URL } = await import('../utils/api');
    const res = await fetch(`${API_URL}/skpi/kegiatan/${kegiatanId}/lampiran/${lampiranId}/file`, {
      credentials: 'include',
    });
    if (!res.ok) {
      throw new Error('Gagal membuka lampiran sertifikat');
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },
};

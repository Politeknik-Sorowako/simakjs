import { fetchApi } from '../utils/api';

export type PembimbingJenis = 'PKL' | 'TA_UTAMA' | 'TA_PENDAMPING';

export interface PembimbingDetail {
  id: number;
  jenis: PembimbingJenis;
  dosenId: number | null;
  dosenNama: string | null;
  dosenNip: string | null;
  namaEksternal: string | null;
  instansiEksternal: string | null;
  statusAktif: boolean;
  catatan: string | null;
  ditetapkanOlehNama: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PembimbingItem {
  mahasiswaId: number;
  nim: string;
  namaMahasiswa: string;
  angkatan: string | null;
  programStudiId: number | null;
  prodiNama: string | null;
  dosenPaId: number | null;
  dosenPaNama: string | null;
  pembimbing: Record<PembimbingJenis, PembimbingDetail | null>;
  jumlahDitetapkan: number;
}

export interface PembimbingListResponse {
  data: PembimbingItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PembimbingFilter {
  programStudiId?: number;
  angkatan?: string;
  angkatanIds?: string[];
  jenis?: PembimbingJenis;
  belumDitetapkan?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface SetPembimbingPayload {
  mahasiswaId: number;
  jenis: PembimbingJenis;
  dosenId?: number | null;
  namaEksternal?: string | null;
  instansiEksternal?: string | null;
  catatan?: string | null;
}

export interface BulkSetPembimbingPayload extends Omit<SetPembimbingPayload, 'mahasiswaId'> {
  mahasiswaIds: number[];
}

export interface BulkSetPembimbingResult {
  updated: number;
  errors: Array<{ mahasiswaId: number; nim: string | null; error: string }>;
}

export const pembimbingController = {
  async list(filter: PembimbingFilter): Promise<PembimbingListResponse> {
    const params = new URLSearchParams();
    if (filter.programStudiId) params.append('programStudiId', String(filter.programStudiId));
    if (filter.angkatan) params.append('angkatan', filter.angkatan);
    if (filter.angkatanIds?.length) params.append('angkatanIds', filter.angkatanIds.join(','));
    if (filter.jenis) params.append('jenis', filter.jenis);
    if (filter.belumDitetapkan) params.append('belumDitetapkan', 'true');
    if (filter.search) params.append('search', filter.search);
    if (filter.page) params.append('page', String(filter.page));
    if (filter.limit) params.append('limit', String(filter.limit));
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchApi<PembimbingListResponse>(`/pembimbing${query}`);
  },

  async getByMahasiswa(mahasiswaId: number): Promise<{ data: PembimbingItem; riwayat: PembimbingDetail[] }> {
    return fetchApi<{ data: PembimbingItem; riwayat: PembimbingDetail[] }>(`/pembimbing/mahasiswa/${mahasiswaId}`);
  },

  async set(payload: SetPembimbingPayload): Promise<{ message: string }> {
    return fetchApi<{ message: string }>('/pembimbing', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async bulkSet(payload: BulkSetPembimbingPayload): Promise<{ data: BulkSetPembimbingResult }> {
    return fetchApi<{ data: BulkSetPembimbingResult }>('/pembimbing/bulk', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async nonaktifkan(id: number): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/pembimbing/${id}/nonaktifkan`, { method: 'PATCH' });
  },

  async importCsv(file: File, jenisDefault?: PembimbingJenis) {
    const form = new FormData();
    form.append('file', file);
    const query = jenisDefault ? `?jenis=${jenisDefault}` : '';
    return fetchApi<{
      message: string;
      data: { successCount: number; skippedCount: number; errors: Array<{ line: number; error: string }> };
    }>(`/pembimbing/import${query}`, { method: 'POST', body: form });
  },
};

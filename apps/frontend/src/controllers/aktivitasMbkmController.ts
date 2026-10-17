import { fetchApi } from '../utils/api';

export type StatusAktivitasMbkm = 'draft' | 'diajukan' | 'disetujui' | 'ditolak' | 'selesai';

export interface JenisAktivitasMbkm {
  id: number;
  nama: string;
  kode: string | null;
  idJenisFeeder: string | null;
  isFlagship: boolean;
  isAktif: boolean;
}

export interface AnggotaAktivitas {
  id: number;
  mahasiswaId: number;
  nim: string;
  nama: string;
  peran: string;
}

export interface PembimbingAktivitas {
  id: number;
  dosenId: number;
  dosenNama: string | null;
  dosenNip: string | null;
  kategori: string;
}

export interface KonversiAktivitas {
  id: number;
  mataKuliahId: number;
  mataKuliahKode: string | null;
  mataKuliahNama: string | null;
  sksDiakui: number;
}

export interface AktivitasMbkm {
  id: number;
  judul: string;
  jenisId: number;
  jenisNama: string | null;
  periodeId: string | null;
  programStudiId: number | null;
  prodiNama: string | null;
  lokasi: string | null;
  institusi: string | null;
  tanggalMulai: string | null;
  tanggalSelesai: string | null;
  sks: number;
  status: StatusAktivitasMbkm;
  deskripsi: string | null;
  idPddikti: string | null;
  dibuatOlehNama: string | null;
  disetujuiOlehNama: string | null;
  disetujuiAt: string | null;
  createdAt: string;
  updatedAt: string;
  anggota: AnggotaAktivitas[];
  pembimbing: PembimbingAktivitas[];
  konversi: KonversiAktivitas[];
  bimbinganTertaut: Array<{ id: number; mahasiswaId: number; periodeId: string }>;
}

export interface AktivitasMbkmListResponse {
  data: AktivitasMbkm[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AktivitasMbkmFilter {
  status?: StatusAktivitasMbkm;
  programStudiId?: number;
  periodeId?: string;
  jenisId?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AktivitasMbkmPayload {
  judul: string;
  jenisId: number;
  periodeId?: string | null;
  programStudiId?: number | null;
  lokasi?: string | null;
  institusi?: string | null;
  tanggalMulai?: string | null;
  tanggalSelesai?: string | null;
  sks?: number | null;
  deskripsi?: string | null;
}

export const aktivitasMbkmController = {
  async listJenis(): Promise<JenisAktivitasMbkm[]> {
    const res = await fetchApi<{ data: JenisAktivitasMbkm[] }>('/aktivitas-mbkm/jenis');
    return res.data;
  },

  async list(filter: AktivitasMbkmFilter): Promise<AktivitasMbkmListResponse> {
    const params = new URLSearchParams();
    if (filter.status) params.append('status', filter.status);
    if (filter.programStudiId) params.append('programStudiId', String(filter.programStudiId));
    if (filter.periodeId) params.append('periodeId', filter.periodeId);
    if (filter.jenisId) params.append('jenisId', String(filter.jenisId));
    if (filter.search) params.append('search', filter.search);
    if (filter.page) params.append('page', String(filter.page));
    if (filter.limit) params.append('limit', String(filter.limit));
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchApi<AktivitasMbkmListResponse>(`/aktivitas-mbkm${query}`);
  },

  async getById(id: number): Promise<AktivitasMbkm> {
    const res = await fetchApi<{ data: AktivitasMbkm }>(`/aktivitas-mbkm/${id}`);
    return res.data;
  },

  async create(payload: AktivitasMbkmPayload): Promise<{ data: { id: number } }> {
    return fetchApi<{ data: { id: number } }>('/aktivitas-mbkm', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async update(id: number, payload: AktivitasMbkmPayload): Promise<{ data: AktivitasMbkm }> {
    return fetchApi<{ data: AktivitasMbkm }>(`/aktivitas-mbkm/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async remove(id: number): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/aktivitas-mbkm/${id}`, { method: 'DELETE' });
  },

  async addAnggota(id: number, mahasiswaId: number, peran: 'ketua' | 'anggota' = 'anggota') {
    return fetchApi<{ message: string }>(`/aktivitas-mbkm/${id}/anggota`, {
      method: 'POST',
      body: JSON.stringify({ mahasiswaId, peran }),
    });
  },

  async removeAnggota(id: number, anggotaId: number) {
    return fetchApi<{ message: string }>(`/aktivitas-mbkm/${id}/anggota/${anggotaId}`, {
      method: 'DELETE',
    });
  },

  async addPembimbing(id: number, dosenId: number, kategori: 'pembimbing' | 'pendamping' = 'pembimbing') {
    return fetchApi<{ message: string }>(`/aktivitas-mbkm/${id}/pembimbing`, {
      method: 'POST',
      body: JSON.stringify({ dosenId, kategori }),
    });
  },

  async removePembimbing(id: number, pembimbingId: number) {
    return fetchApi<{ message: string }>(`/aktivitas-mbkm/${id}/pembimbing/${pembimbingId}`, {
      method: 'DELETE',
    });
  },

  async addKonversi(id: number, mataKuliahId: number, sksDiakui: number) {
    return fetchApi<{ message: string }>(`/aktivitas-mbkm/${id}/konversi`, {
      method: 'POST',
      body: JSON.stringify({ mataKuliahId, sksDiakui }),
    });
  },

  async removeKonversi(id: number, konversiId: number) {
    return fetchApi<{ message: string }>(`/aktivitas-mbkm/${id}/konversi/${konversiId}`, {
      method: 'DELETE',
    });
  },

  async ajukan(id: number) {
    return fetchApi<{ message: string }>(`/aktivitas-mbkm/${id}/ajukan`, { method: 'POST' });
  },

  async setujui(id: number) {
    return fetchApi<{ message: string }>(`/aktivitas-mbkm/${id}/setujui`, { method: 'POST' });
  },

  async tolak(id: number) {
    return fetchApi<{ message: string }>(`/aktivitas-mbkm/${id}/tolak`, { method: 'POST' });
  },

  async setSelesai(id: number) {
    return fetchApi<{ message: string }>(`/aktivitas-mbkm/${id}/selesai`, { method: 'POST' });
  },
};

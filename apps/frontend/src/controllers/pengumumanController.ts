import { fetchApi } from '../utils/api';

export interface LampiranItem {
  id?: number;
  pengumumanId?: number;
  tipe: 'file' | 'gambar' | 'link';
  nama: string;
  url: string;
  ukuran?: number | null;
  mimeType?: string | null;
}

export interface PengumumanItem {
  id: number;
  judul: string;
  konten: string;
  ringkasan?: string | null;
  authorId: number;
  authorRole: string;
  authorNama?: string | null;
  status: 'draft' | 'scheduled' | 'published' | 'withdrawn' | 'archived';
  targetRole: 'semua' | 'mahasiswa' | 'dosen' | 'admin';
  targetProdiType: 'semua' | 'spesifik';
  targetScopeType: 'umum' | 'kelas' | 'rombel';
  isPinned: boolean;
  publishedAt?: string | null;
  withdrawnAt?: string | null;
  withdrawnReason?: string | null;
  expiresAt?: string | null;
  lastAutoSavedAt?: string | null;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  isRead?: boolean;
  lampiran?: LampiranItem[];
  targetProdiIds?: number[];
  targetKelasIds?: number[];
  targetRombelIds?: number[];
  targetProdis?: { id: number; nama: string }[];
  targetKelas?: { id: number; namaKelas: string }[];
  targetRombel?: { id: number; namaGroup: string }[];
}

export interface TargetOptions {
  prodi: { id: number; kode: string; nama: string }[];
  kelas: { id: number; namaKelas: string; mataKuliah: string }[];
  rombel: { id: number; namaGroup: string; kelas: string }[];
}

export interface PaginatedPengumuman {
  data: PengumumanItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const pengumumanController = {
  async getTargetOptions(): Promise<TargetOptions> {
    return fetchApi<TargetOptions>('/pengumuman/target-options');
  },

  async getFeed(search?: string, page = 1, limit = 20): Promise<PaginatedPengumuman> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    params.append('page', String(page));
    params.append('limit', String(limit));
    return fetchApi<PaginatedPengumuman>(`/pengumuman/feed?${params.toString()}`);
  },

  async getManageList(search?: string, status?: string, page = 1, limit = 20): Promise<PaginatedPengumuman> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status && status !== 'all') params.append('status', status);
    params.append('page', String(page));
    params.append('limit', String(limit));
    return fetchApi<PaginatedPengumuman>(`/pengumuman/manage?${params.toString()}`);
  },

  async getDetail(id: number): Promise<PengumumanItem> {
    return fetchApi<PengumumanItem>(`/pengumuman/${id}`);
  },

  async saveDraft(data: Partial<PengumumanItem> & { lampiran?: LampiranItem[] }): Promise<{
    message: string;
    id: number;
    lastAutoSavedAt: string;
  }> {
    return fetchApi('/pengumuman/draft', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async publish(
    data: Partial<PengumumanItem> & {
      publishMode: 'now' | 'scheduled';
      scheduledPublishAt?: string | null;
      lampiran?: LampiranItem[];
    },
  ): Promise<{
    message: string;
    id: number;
    status: string;
    publishedAt: string;
  }> {
    return fetchApi('/pengumuman/publish', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async withdraw(
    id: number,
    reason?: string,
  ): Promise<{
    message: string;
    id: number;
    status: string;
    withdrawnAt: string;
  }> {
    return fetchApi(`/pengumuman/${id}/withdraw`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async delete(id: number): Promise<{ message: string; id: number }> {
    return fetchApi(`/pengumuman/${id}`, {
      method: 'DELETE',
    });
  },

  async uploadAttachment(file: File): Promise<LampiranItem> {
    const fd = new FormData();
    fd.append('file', file);
    return fetchApi<LampiranItem>('/pengumuman/upload-attachment', {
      method: 'POST',
      body: fd,
    });
  },
};

import { fetchApi } from '../utils/api';

export type TugasAkhirTipe = 'individu' | 'kelompok';
export type TugasAkhirStatus =
  | 'draft'
  | 'diajukan'
  | 'revisi_proposal_topik'
  | 'disetujui'
  | 'bimbingan'
  | 'sempro_diajukan'
  | 'sempro_dijadwalkan'
  | 'sempro_selesai'
  | 'sidang_diajukan'
  | 'sidang_dijadwalkan'
  | 'sidang_selesai'
  | 'revisi'
  | 'lulus'
  | 'tidak_lulus';

export type TugasAkhirJenisKarya = 'skripsi' | 'prototipe' | 'proyek_rekayasa' | 'rancang_bangun';

export interface TugasAkhirAnggota {
  id: number;
  tugasAkhirId: number;
  mahasiswaId: number;
  peran: 'ketua' | 'anggota';
  statusKonfirmasi: 'menunggu' | 'diterima' | 'ditolak';
  bagianPengerjaan: string | null;
  mahasiswaNama?: string;
  mahasiswaNim?: string;
  prodiNama?: string;
}

export interface TugasAkhirPembimbing {
  id: number;
  tugasAkhirId: number;
  peran: 'pembimbing_1' | 'pembimbing_2';
  dosenId: number | null;
  namaEksternal: string | null;
  instansiEksternal: string | null;
  catatan: string | null;
  dosenNama?: string;
  dosenNip?: string;
}

export interface TugasAkhirStatusLog {
  id: number;
  tugasAkhirId: number;
  dariStatus: string | null;
  keStatus: string;
  alasan: string | null;
  olehUserId: number;
  createdAt: string;
  userNama?: string;
}

export interface TugasAkhir {
  id: number;
  kodeTa: string;
  tipe: TugasAkhirTipe;
  jenisKarya: TugasAkhirJenisKarya;
  judul: string;
  judulInggris: string | null;
  bidangKajian: string | null;
  latarBelakang: string | null;
  rumusanMasalah: string | null;
  tujuan: string | null;
  metodologi: string | null;
  mitraIndustri: string | null;
  programStudiId: number;
  periodeId: string | null;
  status: TugasAkhirStatus;
  createdById: number;
  catatanProdi: string | null;
  tanggalPengajuan: string;
  tanggalDisetujui: string | null;
  tanggalSelesai: string | null;
  fileProposalTopikUrl: string | null;
  fileLaporanAkhirUrl: string | null;
  createdAt: string;
  updatedAt: string;
  prodiNama?: string;
  prodiKode?: string;
  periodeNama?: string;
  creatorNama?: string;
  anggota?: TugasAkhirAnggota[];
  pembimbing?: TugasAkhirPembimbing[];
  logs?: TugasAkhirStatusLog[];
}

export interface TugasAkhirFilter {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  programStudiId?: number;
  periodeId?: string;
  tipe?: string;
  dosenId?: number;
}

export interface CreateTugasAkhirPayload {
  judul: string;
  judulInggris?: string;
  tipe: TugasAkhirTipe;
  jenisKarya: TugasAkhirJenisKarya;
  bidangKajian?: string;
  latarBelakang?: string;
  rumusanMasalah?: string;
  tujuan?: string;
  metodologi?: string;
  mitraIndustri?: string;
  programStudiId: number;
  periodeId?: string;
  fileProposalTopikUrl?: string;
  mahasiswaId?: number;
  anggotaMahasiswaIds?: number[];
  usulanPembimbing?: {
    peran: 'pembimbing_1' | 'pembimbing_2';
    dosenId?: number;
    namaEksternal?: string;
    instansiEksternal?: string;
    catatan?: string;
  }[];
}

export interface UpdateTugasAkhirPayload {
  judul?: string;
  judulInggris?: string;
  tipe?: TugasAkhirTipe;
  jenisKarya?: TugasAkhirJenisKarya;
  bidangKajian?: string;
  latarBelakang?: string;
  rumusanMasalah?: string;
  tujuan?: string;
  metodologi?: string;
  mitraIndustri?: string;
  fileProposalTopikUrl?: string;
}

export interface ReviewTopikPayload {
  status: 'disetujui' | 'ditolak' | 'revisi_proposal_topik';
  catatanProdi?: string;
  pembimbing?: {
    peran: 'pembimbing_1' | 'pembimbing_2';
    dosenId?: number;
    namaEksternal?: string;
    instansiEksternal?: string;
    catatan?: string;
  }[];
}

export interface OverrideStatusPayload {
  keStatus: TugasAkhirStatus;
  alasan: string;
}

export const tugasAkhirController = {
  async getAll(params?: TugasAkhirFilter): Promise<{ data: TugasAkhir[]; total: number; page: number; limit: number }> {
    const q = new URLSearchParams();
    if (params?.page) q.append('page', String(params.page));
    if (params?.limit) q.append('limit', String(params.limit));
    if (params?.search) q.append('search', params.search);
    if (params?.status) q.append('status', params.status);
    if (params?.programStudiId) q.append('programStudiId', String(params.programStudiId));
    if (params?.periodeId) q.append('periodeId', params.periodeId);
    if (params?.tipe) q.append('tipe', params.tipe);
    if (params?.dosenId) q.append('dosenId', String(params.dosenId));

    const qs = q.toString() ? `?${q.toString()}` : '';
    const res = await fetchApi<{ data: TugasAkhir[]; total: number; page: number; limit: number }>(`/tugas-akhir${qs}`);
    return res;
  },

  async getById(id: number): Promise<TugasAkhir> {
    const res = await fetchApi<{ data: TugasAkhir }>(`/tugas-akhir/${id}`);
    return res.data;
  },

  async create(payload: CreateTugasAkhirPayload): Promise<TugasAkhir> {
    const res = await fetchApi<{ data: TugasAkhir; message: string }>('/tugas-akhir', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async update(id: number, payload: UpdateTugasAkhirPayload): Promise<TugasAkhir> {
    const res = await fetchApi<{ data: TugasAkhir; message: string }>(`/tugas-akhir/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async reviewTopik(id: number, payload: ReviewTopikPayload): Promise<TugasAkhir> {
    const res = await fetchApi<{ data: TugasAkhir; message: string }>(`/tugas-akhir/${id}/review`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async overrideStatus(id: number, payload: OverrideStatusPayload): Promise<TugasAkhir> {
    const res = await fetchApi<{ data: TugasAkhir; message: string }>(`/tugas-akhir/${id}/override-status`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async responUndangan(id: number, statusKonfirmasi: 'diterima' | 'ditolak'): Promise<void> {
    await fetchApi<{ message: string }>(`/tugas-akhir/${id}/respon-undangan`, {
      method: 'POST',
      body: JSON.stringify({ statusKonfirmasi }),
    });
  },
};

import { fetchApi } from '../utils/api';
import { type KompensasiDetailResponse, presensiController } from './presensiController';
import type { PaginatedResponse } from './prodiController';

export type KetidakhadiranSumber = 'BAP' | 'APEL' | 'PRAKTIKUM' | 'MANUAL';
export type StatusVerif = 'belum' | 'sudah' | 'all';

export interface KetidakhadiranRow {
  id: number;
  mahasiswaId: number;
  nim: string;
  nama: string;
  foto?: string | null;
  prodiId?: number | null;
  prodiNama?: string | null;
  tanggal: string;
  sumber: KetidakhadiranSumber;
  sumberId?: number | null;
  status: string;
  durasiMenit: number;
  keterangan?: string | null;
  isVerified: boolean;
  verifiedBy?: number | null;
  verifiedByName?: string | null;
  verifiedAt?: string | null;
  sumberLabel?: string | null;
  pertemuanKe?: number | null;
  materi?: string | null;
  lampiranEvidens?: string | null;
  kelasKuliahId?: number | null;
  bapId?: number | null;
  bapPraktikumId?: number | null;
  rombelPraktikumId?: number | null;
  namaGroup?: string | null;
  sesiApelId?: number | null;
  kelompokApelId?: number | null;
  tanggalSesiApel?: string | null;
  namaKelas?: string | null;
  mataKuliahKode?: string | null;
  mataKuliahNama?: string | null;
  dosenNama?: string | null;
  kelompokNama?: string | null;
  shift?: string | null;
  verificationNote?: string | null;
  kompensasiManualId?: number | null;
  createdBy?: number | null;
  createdByName?: string | null;
}

export interface PaymentRow {
  id: number;
  mahasiswaId: number;
  nim: string;
  nama: string;
  foto?: string | null;
  prodiId?: number | null;
  prodiNama?: string | null;
  jumlahMenit: number;
  tanggal: string;
  keterangan: string;
  petugasId?: number | null;
  petugasNama?: string | null;
  createdAt?: string | null;
}

export interface RiwayatListParams {
  page?: number;
  limit?: number;
  search?: string;
  prodiId?: number;
  tglDari?: string;
  tglSampai?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface RiwayatKetidakhadiranParams extends RiwayatListParams {
  sumber?: KetidakhadiranSumber;
  statusVerif?: 'belum' | 'sudah';
}

export const kompensasiAdminController = {
  getRiwayatKetidakhadiran(params: RiwayatKetidakhadiranParams): Promise<PaginatedResponse<KetidakhadiranRow>> {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    if (params.search) q.set('search', params.search);
    if (params.prodiId) q.set('prodiId', String(params.prodiId));
    if (params.tglDari) q.set('tglDari', params.tglDari);
    if (params.tglSampai) q.set('tglSampai', params.tglSampai);
    if (params.sortBy) q.set('sortBy', params.sortBy);
    if (params.sortOrder) q.set('sortOrder', params.sortOrder);
    if (params.sumber) q.set('sumber', params.sumber);
    if (params.statusVerif) q.set('statusVerif', params.statusVerif);
    const qs = q.toString();
    return fetchApi<PaginatedResponse<KetidakhadiranRow>>(`/ketidakhadiran/riwayat-unified${qs ? `?${qs}` : ''}`);
  },

  getRekamanKompensasi(
    params: RiwayatListParams & { sumber?: KetidakhadiranSumber },
  ): Promise<PaginatedResponse<KetidakhadiranRow>> {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    if (params.search) q.set('search', params.search);
    if (params.prodiId) q.set('prodiId', String(params.prodiId));
    if (params.tglDari) q.set('tglDari', params.tglDari);
    if (params.tglSampai) q.set('tglSampai', params.tglSampai);
    if (params.sortBy) q.set('sortBy', params.sortBy);
    if (params.sortOrder) q.set('sortOrder', params.sortOrder);
    if (params.sumber) q.set('sumber', params.sumber);
    const qs = q.toString();
    return fetchApi<PaginatedResponse<KetidakhadiranRow>>(`/kompensasi/rekaman${qs ? `?${qs}` : ''}`);
  },

  async bulkAnulirKetidakhadiran(ids: number[]): Promise<{ success: boolean; anulir: number; manualDeleted: number }> {
    return fetchApi('/kompensasi/rekaman/bulk-anulir', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  },

  getRiwayatPembayaran(params: RiwayatListParams): Promise<PaginatedResponse<PaymentRow>> {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    if (params.search) q.set('search', params.search);
    if (params.prodiId) q.set('prodiId', String(params.prodiId));
    if (params.tglDari) q.set('tglDari', params.tglDari);
    if (params.tglSampai) q.set('tglSampai', params.tglSampai);
    if (params.sortBy) q.set('sortBy', params.sortBy);
    if (params.sortOrder) q.set('sortOrder', params.sortOrder);
    const qs = q.toString();
    return fetchApi<PaginatedResponse<PaymentRow>>(`/presensi/kompensasi/bayar${qs ? `?${qs}` : ''}`);
  },

  async deletePembayaran(id: number): Promise<{ success: boolean }> {
    return fetchApi(`/presensi/kompensasi/bayar/${id}`, { method: 'DELETE' });
  },

  async bulkDeletePembayaran(ids: number[]): Promise<{ success: boolean; deleted: number }> {
    return fetchApi('/presensi/kompensasi/bayar/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  },
};

export function rekapBulan(totalMenit: number): string {
  const jam = Math.floor(totalMenit / 60);
  const mnt = totalMenit % 60;
  return mnt === 0 ? `${jam} jam` : `${jam} jam ${mnt} mnt`;
}

export type { KompensasiDetailResponse };
export { presensiController };

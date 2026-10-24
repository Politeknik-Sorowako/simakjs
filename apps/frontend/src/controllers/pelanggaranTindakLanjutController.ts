import { fetchApi } from '../utils/api';

export type TingkatTindakLanjut = 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | 'LEVEL_4';
export type StatusTindakLanjut =
  | 'MENUNGGU_FORM'
  | 'DALAM_PROSES_PERSETUJUAN'
  | 'MENUNGGU_PERSETUJUAN'
  | 'SELESAI'
  | 'DITOLAK'
  | 'REVISI'
  | 'DIBATALKAN';
export type StatusPersetujuan = 'MENUNGGU' | 'DISETUJUI_TTE' | 'DISETUJUI_MANUAL' | 'DISETUJUI' | 'DITOLAK';

export interface TindakLanjutPersetujuan {
  id: number;
  tindakLanjutId: number;
  urutan: number;
  roleTarget: string;
  approverRole?: string;
  status: StatusPersetujuan;
  userId: number | null;
  approverUserId?: number | null;
  namaPenandatangan: string | null;
  approverNama?: string | null;
  jabatanPenandatangan: string | null;
  signatureUuid: string | null;
  catatan: string | null;
  respondedAt: string | null;
  decidedAt?: string | null;
  createdAt: string;
}

export interface KasusTindakLanjut {
  id: number;
  mahasiswaId: number;
  nim: string;
  namaMahasiswa: string;
  programStudiId: number | null;
  prodiNama: string | null;
  periodeId: string;
  tingkat: TingkatTindakLanjut;
  pemicuTipe: 'SEMESTER' | 'AKUMULASI';
  pemicuTNilai: number;
  status: StatusTindakLanjut;
  formData: Record<string, unknown> | null;
  formSubmittedAt: string | null;
  formSubmittedByUserId: number | null;
  namaSubmitter: string | null;
  selesaiAt: string | null;
  createdAt: string;
  updatedAt: string;
  persetujuanList?: TindakLanjutPersetujuan[];
}

export interface TindakLanjutListResponse {
  data: KasusTindakLanjut[];
  total: number;
  page: number;
  limit: number;
}

export const pelanggaranTindakLanjutController = {
  async list(params?: {
    status?: string;
    tingkat?: string;
    periodeId?: string;
    page?: number;
    limit?: number;
  }): Promise<TindakLanjutListResponse> {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.tingkat) q.set('tingkat', params.tingkat);
    if (params?.periodeId) q.set('periodeId', params.periodeId);
    if (params?.page) q.set('page', params.page.toString());
    if (params?.limit) q.set('limit', params.limit.toString());

    return fetchApi(`/pelanggaran/tindak-lanjut?${q.toString()}`);
  },

  async getById(id: number): Promise<KasusTindakLanjut> {
    return fetchApi(`/pelanggaran/tindak-lanjut/${id}`);
  },

  async submitForm(
    id: number,
    formData: Record<string, unknown>,
  ): Promise<{ success: boolean; data: KasusTindakLanjut }> {
    return fetchApi(`/pelanggaran/tindak-lanjut/${id}/form`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        formData,
        formCoaching: formData,
        suratPemanggilanOrtu: formData,
        beritaAcaraSidang: formData,
      }),
    });
  },

  async approve(
    id: number,
    payload: { tipe: 'TTE' | 'MANUAL'; catatan?: string },
  ): Promise<{ success: boolean; data: KasusTindakLanjut; qrDataUrl?: string; verifyUrl?: string }> {
    return fetchApi(`/pelanggaran/tindak-lanjut/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        metode: payload.tipe,
      }),
    });
  },

  async reject(id: number, alasan: string): Promise<{ success: boolean; data: KasusTindakLanjut }> {
    return fetchApi(`/pelanggaran/tindak-lanjut/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alasan,
        catatan: alasan,
      }),
    });
  },

  async cancel(id: number, alasan: string): Promise<{ success: boolean; data: KasusTindakLanjut }> {
    return fetchApi(`/pelanggaran/tindak-lanjut/${id}/batal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alasan,
        catatan: alasan,
      }),
    });
  },
};

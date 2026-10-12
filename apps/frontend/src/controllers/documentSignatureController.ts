import { API_URL, fetchApi } from '../utils/api';

export interface SignatureInfo {
  status: 'VALID' | 'REVOKED' | 'TAMPERED' | 'NOT_FOUND';
  tenant?: string;
  docType?: string;
  namaMask?: string;
  nimMask?: string;
  prodi?: string;
  periodeNama?: string;
  signerNama?: string;
  signerJabatan?: string | null;
  signedAtWITA?: string;
  docHashShort?: string;
  error?: string;
}

export interface SignKhsResult {
  verifyUuid: string;
  verifyUrl: string;
  docHash: string;
  kid: string;
  signedAt: string;
  signerNama: string;
  signerJabatan: string | null;
  /** QR hanya disertakan endpoint sign; `getByRef` tidak mengembalikannya. */
  qrDataUrl?: string;
}

export interface KhsSignStatusItem {
  mahasiswaId: number;
  nim: string;
  nama: string;
  signed: boolean;
  signerNama: string | null;
  signerJabatan: string | null;
  signedAt: string | null;
  verifyUuid: string | null;
}

export interface KhsSignStatusPage {
  data: KhsSignStatusItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface BulkSignKhsResult {
  total: number;
  signedCount: number;
  failedCount: number;
  failed: { mahasiswaId: number; error: string }[];
}

export interface BulkRevokeResult {
  total: number;
  revokedCount: number;
  failedCount: number;
  failed: { uuid: string; error: string }[];
}

export const documentSignatureController = {
  /**
   * Verifikasi publik (POST + token Turnstile sebagai antibot). Endpoint
   * mengembalikan HTTP 404 (NOT_FOUND) dan 410 (REVOKED) dengan status di
   * body. `fetchApi` melempar pada respons non-2xx sehingga status REVOKED
   * tidak akan terbaca — baca body secara langsung.
   */
  verifyPublic: async (uuid: string, turnstileToken = ''): Promise<SignatureInfo> => {
    const res = await fetch(`${API_URL}/document-signatures/verify`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uuid, turnstileToken }),
    });
    const data = (await res.json().catch(() => null)) as SignatureInfo | null;
    if (data && typeof data.status === 'string') return data;
    return { status: 'NOT_FOUND' };
  },
  signKhs: (mhsId: number, periodeId: string) =>
    fetchApi<SignKhsResult>(`/document-signatures/khs/${mhsId}/${periodeId}/sign`, { method: 'POST' }),
  getByRef: (mhsId: number, periodeId: string) =>
    fetchApi<SignKhsResult | null>(`/document-signatures/khs/${mhsId}/${periodeId}`),
  listSignStatus: (params: {
    periodeId: string;
    programStudiId: number;
    search?: string;
    status?: 'all' | 'signed' | 'unsigned';
    page?: number;
    limit?: number;
  }) => {
    const qs = new URLSearchParams({
      periodeId: params.periodeId,
      programStudiId: String(params.programStudiId),
    });
    if (params.search) qs.set('search', params.search);
    if (params.status) qs.set('status', params.status);
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    return fetchApi<KhsSignStatusPage>(`/document-signatures/khs/sign-status?${qs}`);
  },
  /**
   * Tanda tangan massal (maks 50 ID per permintaan). Pemanggil bertanggung
   * jawab memecah daftar besar menjadi batch ≤ 50.
   */
  signBulkKhs: (periodeId: string, mahasiswaIds: number[]) =>
    fetchApi<BulkSignKhsResult>('/document-signatures/khs/bulk-sign', {
      method: 'POST',
      body: JSON.stringify({ periodeId, mahasiswaIds }),
    }),
  /**
   * Pencabutan tanda tangan massal (maks 50 UUID per permintaan) dengan satu
   * alasan. Pemanggil memecah daftar besar menjadi batch ≤ 50.
   */
  bulkRevokeSignatures: (uuids: string[], reason: string) =>
    fetchApi<BulkRevokeResult>('/document-signatures/bulk-revoke', {
      method: 'POST',
      body: JSON.stringify({ uuids, reason }),
    }),
};

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

export const documentSignatureController = {
  /**
   * Verifikasi publik. Endpoint mengembalikan HTTP 404 (NOT_FOUND) dan 410
   * (REVOKED) dengan status di body. `fetchApi` melempar pada respons non-2xx
   * sehingga status REVOKED tidak akan terbaca — baca body secara langsung.
   */
  verifyPublic: async (uuid: string): Promise<SignatureInfo> => {
    const res = await fetch(`${API_URL}/document-signatures/verify/${uuid}`, {
      method: 'GET',
      credentials: 'include',
    });
    const data = (await res.json().catch(() => null)) as SignatureInfo | null;
    if (data && typeof data.status === 'string') return data;
    return { status: 'NOT_FOUND' };
  },
  signKhs: (mhsId: number, periodeId: string) =>
    fetchApi<SignKhsResult>(`/document-signatures/khs/${mhsId}/${periodeId}/sign`, { method: 'POST' }),
  getByRef: (mhsId: number, periodeId: string) =>
    fetchApi<SignKhsResult | null>(`/document-signatures/khs/${mhsId}/${periodeId}`),
};

import { fetchApi } from '../utils/api';

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
  qrDataUrl: string;
}

export const documentSignatureController = {
  verifyPublic: (uuid: string) =>
    fetchApi<SignatureInfo>(`/document-signatures/verify/${uuid}`, { requireAuth: false }),
  signKhs: (mhsId: number, periodeId: string) =>
    fetchApi<SignKhsResult>(`/document-signatures/khs/${mhsId}/${periodeId}/sign`, { method: 'POST' }),
  getByRef: (mhsId: number, periodeId: string) =>
    fetchApi<SignKhsResult | null>(`/document-signatures/khs/${mhsId}/${periodeId}`),
};

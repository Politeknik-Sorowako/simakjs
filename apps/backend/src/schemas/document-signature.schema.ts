import { t } from 'elysia';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const verifySignatureSchema = {
  detail: {
    tags: ['Dokumen'],
    summary: 'Verifikasi Tanda Tangan Dokumen',
    description: 'Verifikasi publik tanda tangan dokumen via verifyUuid yang dipindai QR (tanpa autentikasi).',
  },
  params: t.Object({
    uuid: t.String({ pattern: UUID_PATTERN.source, examples: ['70960e44-7a9e-4f78-9b7e-1a2b3c4d5e6f'] }),
  }),
};

export const signKhsSchema = {
  detail: {
    tags: ['Dokumen'],
    summary: 'Tanda Tangan KHS (QR Signed-Hash)',
    description: 'Menandatangani KHS mahasiswa per periode secara idempoten dan menghasilkan QR verifikasi publik.',
  },
  params: t.Object({
    mhsId: t.String(),
    periodeId: t.String(),
  }),
};

export const getSignatureByRefSchema = {
  detail: {
    tags: ['Dokumen'],
    summary: 'Tanda Tangan KHS yang Sudah Ada',
    description: 'Mengambil tanda tangan KHS yang sudah aktif (jika ada) untuk kebutuhan cetak.',
  },
  params: t.Object({
    mhsId: t.String(),
    periodeId: t.String(),
  }),
};

export const revokeSignatureSchema = {
  detail: {
    tags: ['Dokumen'],
    summary: 'Cabut Tanda Tangan Dokumen',
    description: 'Mencabut tanda tangan dokumen sehingga status verifikasi menjadi REVOKED.',
  },
  params: t.Object({
    uuid: t.String({ pattern: UUID_PATTERN.source }),
  }),
  body: t.Object({
    reason: t.String({ minLength: 3 }),
  }),
};

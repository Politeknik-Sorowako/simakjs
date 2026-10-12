import { t } from 'elysia';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const verifySignaturePostSchema = {
  detail: {
    tags: ['Dokumen'],
    summary: 'Verifikasi Tanda Tangan Dokumen',
    description:
      'Verifikasi publik tanda tangan dokumen via verifyUuid (tanpa autentikasi). Dilindungi Turnstile sebagai antibot.',
  },
  body: t.Object({
    uuid: t.String({ pattern: UUID_PATTERN.source, examples: ['70960e44-7a9e-4f78-9b7e-1a2b3c4d5e6f'] }),
    turnstileToken: t.Optional(t.String()),
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

export const listKhsSignStatusSchema = {
  detail: {
    tags: ['Dokumen'],
    summary: 'Daftar Status Tanda Tangan KHS per Periode',
    description:
      'Daftar mahasiswa (per program studi & periode) beserta status tanda tangan KHS-nya. Hanya Kaprodi/Admin/super_admin dengan scope prodi yang relevan.',
  },
  query: t.Object({
    periodeId: t.String({ minLength: 1 }),
    programStudiId: t.Numeric({ minimum: 1 }),
    search: t.Optional(t.String({ maxLength: 100 })),
    page: t.Optional(t.Numeric({ default: 1, minimum: 1 })),
    limit: t.Optional(t.Numeric({ default: 20, minimum: 1, maximum: 100 })),
  }),
};

export const bulkSignKhsSchema = {
  detail: {
    tags: ['Dokumen'],
    summary: 'Tanda Tangan KHS Massal',
    description:
      'Menandatangani KHS untuk beberapa mahasiswa sekaligus (maks 50 per permintaan). Proses per-baris dengan hasil gagal individual; idempoten per dokumen.',
  },
  body: t.Object({
    periodeId: t.String({ minLength: 1 }),
    mahasiswaIds: t.Array(t.Integer({ minimum: 1 }), { minItems: 1, maxItems: 50 }),
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

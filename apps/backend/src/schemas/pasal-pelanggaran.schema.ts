import { t } from 'elysia';

export const pasalPelanggaranBody = t.Object({
  nomorPasal: t.String({ minLength: 1, maxLength: 50, default: 'Pasal 1' }),
  bunyiPasal: t.String({ minLength: 3, default: 'Berpakaian tidak rapi selama kegiatan akademik.' }),
  bobotPoin: t.Integer({ minimum: 1, maximum: 100, default: 5 }),
  jenisSanksi: t.Integer({ minimum: 1, maximum: 4, default: 1 }),
  programStudiId: t.Optional(t.Union([t.Integer(), t.Null()])),
});

export const getAllPasalSchema = {
  detail: {
    tags: ['Kedisiplinan'],
    summary: 'Daftar Pasal Pelanggaran (BPA)',
    description: 'Mengambil daftar pasal pelanggaran sesuai BPA. Admin Prodi dapat menambah/edit pasal per prodi.',
  },
  query: t.Object({
    search: t.Optional(t.String()),
    programStudiId: t.Optional(t.String()),
    includeInactive: t.Optional(t.String()),
  }),
  response: {
    200: t.Array(
      t.Object({
        id: t.Integer(),
        nomorPasal: t.String(),
        bunyiPasal: t.String(),
        bobotPoin: t.Integer(),
        jenisSanksi: t.Integer(),
        programStudiId: t.Optional(t.Union([t.Integer(), t.Null()])),
        prodiNama: t.Optional(t.Union([t.String(), t.Null()])),
        isActive: t.Boolean(),
        createdAt: t.Union([t.Date(), t.Null()]),
        updatedAt: t.Union([t.Date(), t.Null()]),
      }),
    ),
  },
};

export const createPasalSchema = {
  detail: {
    tags: ['Kedisiplinan'],
    summary: 'Tambah Pasal Pelanggaran',
    description: 'Admin/Admin Prodi menambahkan pasal pelanggaran beserta bunyi pasal dan jenis sanksi.',
  },
  body: pasalPelanggaranBody,
  response: {
    201: t.Object({
      id: t.Integer(),
      nomorPasal: t.String(),
      bunyiPasal: t.String(),
      bobotPoin: t.Integer(),
      jenisSanksi: t.Integer(),
      programStudiId: t.Optional(t.Union([t.Integer(), t.Null()])),
      isActive: t.Boolean(),
      createdAt: t.Union([t.Date(), t.Null()]),
      updatedAt: t.Union([t.Date(), t.Null()]),
    }),
    400: t.Object({ error: t.String() }),
    403: t.Object({ error: t.String() }),
  },
};

export const updatePasalSchema = {
  detail: {
    tags: ['Kedisiplinan'],
    summary: 'Update Pasal Pelanggaran',
    description: 'Memperbarui data pasal pelanggaran berdasarkan ID.',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
  body: t.Partial(pasalPelanggaranBody),
  response: {
    200: t.Object({
      id: t.Integer(),
      nomorPasal: t.String(),
      bunyiPasal: t.String(),
      bobotPoin: t.Integer(),
      jenisSanksi: t.Integer(),
      programStudiId: t.Optional(t.Union([t.Integer(), t.Null()])),
      isActive: t.Boolean(),
      createdAt: t.Union([t.Date(), t.Null()]),
      updatedAt: t.Union([t.Date(), t.Null()]),
    }),
    400: t.Object({ error: t.String() }),
    403: t.Object({ error: t.String() }),
    404: t.Object({ error: t.String() }),
  },
};

export const deletePasalSchema = {
  detail: {
    tags: ['Kedisiplinan'],
    summary: 'Hapus Pasal Pelanggaran',
    description: 'Menghapus data pasal pelanggaran berdasarkan ID.',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
  response: {
    200: t.Object({ success: t.Boolean() }),
    403: t.Object({ error: t.String() }),
    404: t.Object({ error: t.String() }),
  },
};

import { t } from 'elysia';

export const periodeBody = t.Object({
  id: t.String({ minLength: 5, maxLength: 5, default: '20231' }),
  nama: t.String({ default: '2023/2024 Ganjil' }),
  aktif: t.Optional(t.Boolean({ default: false })),
  idPddikti: t.Optional(t.String()),
});

export const getPeriodeSchema = {
  detail: {
    tags: ['Periode Akademik'],
    summary: 'Daftar Periode Akademik',
    description: 'Mengambil semua data periode akademik yang terdaftar dengan pagination dan filter pencarian.',
  },
  query: t.Object({
    page: t.Optional(t.Numeric({ default: 1 })),
    limit: t.Optional(t.Numeric({ default: 10 })),
    search: t.Optional(t.String({ default: '' })),
  }),
  response: {
    200: t.Object({
      data: t.Array(
        t.Object({
          id: t.String({ default: '20231' }),
          nama: t.String({ default: '2023/2024 Ganjil' }),
          aktif: t.Boolean({ default: false }),
          idPddikti: t.Union([t.String(), t.Null()], { default: null }),
          isSynced: t.Boolean({ default: false }),
          lastSyncAt: t.Any(),
          createdAt: t.Any(),
          updatedAt: t.Any(),
        }),
      ),
      meta: t.Object({
        total: t.Integer({ default: 1 }),
        page: t.Integer({ default: 1 }),
        limit: t.Integer({ default: 10 }),
        totalPages: t.Integer({ default: 1 }),
      }),
    }),
  },
};

export const createPeriodeSchema = {
  detail: {
    tags: ['Periode Akademik'],
    summary: 'Tambah Periode Akademik Baru',
    description: 'Menambahkan periode akademik baru (Hanya dapat diakses Admin).',
  },
  body: periodeBody,
  response: {
    201: t.Object({
      id: t.String({ default: '20231' }),
      nama: t.String({ default: '2023/2024 Ganjil' }),
      aktif: t.Boolean({ default: false }),
      idPddikti: t.Union([t.String(), t.Null()], { default: null }),
      isSynced: t.Boolean({ default: false }),
      lastSyncAt: t.Union([t.String(), t.Null()], { default: null }),
      createdAt: t.Any(),
      updatedAt: t.Any(),
    }),
    403: t.Object({
      error: t.String({ default: 'Akses ditolak. Hanya Admin.' }),
    }),
  },
};

export const getPeriodeByIdSchema = {
  detail: {
    tags: ['Periode Akademik'],
    summary: 'Detail Periode Akademik',
    description: 'Mengambil satu data periode akademik berdasarkan ID.',
  },
  params: t.Object({
    id: t.String(),
  }),
  response: {
    200: t.Object({
      id: t.String({ default: '20231' }),
      nama: t.String({ default: '2023/2024 Ganjil' }),
      aktif: t.Boolean({ default: false }),
      idPddikti: t.Union([t.String(), t.Null()], { default: null }),
      isSynced: t.Boolean({ default: false }),
      lastSyncAt: t.Union([t.String(), t.Null()], { default: null }),
      createdAt: t.Any(),
      updatedAt: t.Any(),
    }),
    404: t.Object({
      error: t.String({ default: 'Data tidak ditemukan' }),
    }),
  },
};

export const updatePeriodeSchema = {
  detail: {
    tags: ['Periode Akademik'],
    summary: 'Perbarui Periode Akademik',
    description: 'Memperbarui data periode akademik berdasarkan ID (Hanya dapat diakses oleh Admin).',
  },
  params: t.Object({
    id: t.String(),
  }),
  body: t.Object({
    nama: t.Optional(t.String()),
    aktif: t.Optional(t.Boolean()),
    idPddikti: t.Optional(t.String()),
  }),
  response: {
    200: t.Object({
      id: t.String({ default: '20231' }),
      nama: t.String({ default: '2023/2024 Ganjil' }),
      aktif: t.Boolean({ default: false }),
      idPddikti: t.Union([t.String(), t.Null()], { default: null }),
      isSynced: t.Boolean({ default: false }),
      lastSyncAt: t.Union([t.String(), t.Null()], { default: null }),
      createdAt: t.Any(),
      updatedAt: t.Any(),
    }),
    403: t.Object({
      error: t.String({ default: 'Akses ditolak. Hanya Admin.' }),
    }),
    404: t.Object({
      error: t.String({ default: 'Data tidak ditemukan' }),
    }),
  },
};

export const deletePeriodeSchema = {
  detail: {
    tags: ['Periode Akademik'],
    summary: 'Hapus Periode Akademik',
    description: 'Menghapus data periode akademik berdasarkan ID (Hanya dapat diakses oleh Admin).',
  },
  params: t.Object({
    id: t.String(),
  }),
  response: {
    200: t.Object({
      message: t.String({ default: 'Periode Akademik berhasil dihapus' }),
    }),
    403: t.Object({
      error: t.String({ default: 'Akses ditolak. Hanya Admin.' }),
    }),
    404: t.Object({
      error: t.String({ default: 'Data tidak ditemukan' }),
    }),
  },
};

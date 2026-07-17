import { t } from 'elysia';

export const cpmkBody = t.Object({
  mataKuliahId: t.Integer({ default: 1 }),
  kurikulumMataKuliahId: t.Optional(t.Integer()),
  kode: t.String({ default: 'CPMK-1' }),
  deskripsi: t.String({ default: 'Mampu menerapkan konsep dasar pemrograman' }),
});

export const updateCpmkBody = t.Object({
  kode: t.Optional(t.String()),
  deskripsi: t.Optional(t.String()),
  kurikulumMataKuliahId: t.Optional(t.Integer()),
});

export const getAllCpmkSchema = {
  detail: {
    tags: ['CPMK'],
    summary: 'Daftar CPMK',
    description: 'Mengambil daftar CPMK dengan filter kurikulum, mata kuliah, dan pencarian.',
  },
  query: t.Object({
    page: t.Optional(t.Numeric({ default: 1 })),
    limit: t.Optional(t.Numeric({ default: 10 })),
    search: t.Optional(t.String({ default: '' })),
    kurikulumId: t.Optional(t.Numeric()),
    mataKuliahId: t.Optional(t.Numeric()),
  }),
  response: {
    200: t.Object({
      data: t.Array(
        t.Object({
          id: t.Integer({ default: 1 }),
          mataKuliahId: t.Integer({ default: 1 }),
          kurikulumMataKuliahId: t.Nullable(t.Integer()),
          kode: t.String({ default: 'CPMK-1' }),
          deskripsi: t.String({ default: 'Mampu menerapkan konsep dasar pemrograman' }),
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

export const createCpmkSchema = {
  detail: {
    tags: ['CPMK'],
    summary: 'Tambah CPMK Baru',
    description: 'Menambahkan CPMK baru untuk Mata Kuliah tertentu.',
  },
  body: cpmkBody,
  response: {
    201: t.Object({
      id: t.Integer({ default: 1 }),
      mataKuliahId: t.Integer({ default: 1 }),
      kurikulumMataKuliahId: t.Nullable(t.Integer()),
      kode: t.String({ default: 'CPMK-1' }),
      deskripsi: t.String({ default: 'Mampu menerapkan konsep dasar pemrograman' }),
    }),
    400: t.Object({
      error: t.String({ default: 'Kode CPMK sudah ada untuk mata kuliah ini' }),
    }),
  },
};

export const getCpmkByMataKuliahSchema = {
  detail: {
    tags: ['CPMK'],
    summary: 'Daftar CPMK Mata Kuliah',
    description: 'Mengambil daftar CPMK berdasarkan ID Mata Kuliah.',
  },
  params: t.Object({
    mataKuliahId: t.Numeric(),
  }),
  response: {
    200: t.Array(
      t.Object({
        id: t.Integer({ default: 1 }),
        mataKuliahId: t.Integer({ default: 1 }),
        kurikulumMataKuliahId: t.Nullable(t.Integer()),
        kode: t.String({ default: 'CPMK-1' }),
        deskripsi: t.String({ default: 'Mampu menerapkan konsep dasar pemrograman' }),
      }),
    ),
  },
};

export const getCpmkByIdSchema = {
  detail: {
    tags: ['CPMK'],
    summary: 'Detail CPMK',
    description: 'Mengambil satu data CPMK berdasarkan ID dengan SubCPMK dan mapping CPL.',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
};

export const updateCpmkSchema = {
  detail: {
    tags: ['CPMK'],
    summary: 'Perbarui CPMK',
    description: 'Memperbarui data CPMK berdasarkan ID.',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
  body: updateCpmkBody,
  response: {
    200: t.Object({
      id: t.Integer({ default: 1 }),
      mataKuliahId: t.Integer({ default: 1 }),
      kurikulumMataKuliahId: t.Nullable(t.Integer()),
      kode: t.String({ default: 'CPMK-1' }),
      deskripsi: t.String({ default: 'Mampu menerapkan konsep dasar pemrograman' }),
    }),
    400: t.Object({
      error: t.String({ default: 'Kode CPMK sudah ada untuk mata kuliah ini' }),
    }),
  },
};

export const deleteCpmkSchema = {
  detail: {
    tags: ['CPMK'],
    summary: 'Hapus CPMK',
    description: 'Menghapus CPMK berdasarkan ID.',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
  response: {
    200: t.Object({
      message: t.String({ default: 'CPMK berhasil dihapus' }),
    }),
  },
};

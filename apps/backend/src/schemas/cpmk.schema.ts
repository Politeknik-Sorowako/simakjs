import { t } from 'elysia';

export const cpmkBody = t.Object({
  mataKuliahId: t.Integer({ default: 1 }),
  kurikulumMataKuliahId: t.Optional(t.Integer()),
  kode: t.String({ default: 'CPMK-1' }),
  deskripsi: t.String({ default: 'Mampu menerapkan konsep dasar pemrograman' }),
});

export const updateCpmkBody = t.Partial(
  t.Object({
    kode: t.String(),
    deskripsi: t.String(),
    kurikulumMataKuliahId: t.Integer(),
  }),
);

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

import { t } from 'elysia';

export const mataKuliahBody = t.Object({
  programStudiId: t.Integer({ default: 1 }),
  kode: t.String({ default: 'MK001' }),
  nama: t.String({ default: 'Pemrograman Web' }),
  sksTotal: t.Integer({ default: 3 }),
  sksTatapMuka: t.Optional(t.Integer({ default: 2 })),
  sksPraktek: t.Optional(t.Integer({ default: 1 })),
  idPddikti: t.Optional(t.String()),
  kurikulumId: t.Optional(t.Integer()),
  semester: t.Optional(t.Integer()),
});

export const updateMataKuliahBody = t.Object({
  programStudiId: t.Optional(t.Integer()),
  kode: t.Optional(t.String()),
  nama: t.Optional(t.String()),
  sksTotal: t.Optional(t.Integer()),
  sksTatapMuka: t.Optional(t.Integer()),
  sksPraktek: t.Optional(t.Integer()),
  idPddikti: t.Optional(t.String()),
  kurikulumId: t.Optional(t.Integer()),
  semester: t.Optional(t.Integer()),
});

const mataKuliahResponseFields = {
  id: t.Integer({ default: 1 }),
  programStudiId: t.Union([t.Integer(), t.Null()], { default: 1 }),
  kode: t.String({ default: 'MK001' }),
  nama: t.String({ default: 'Pemrograman Web' }),
  sksTotal: t.Integer({ default: 3 }),
  sksTatapMuka: t.Union([t.Integer(), t.Null()], { default: 2 }),
  sksPraktek: t.Union([t.Integer(), t.Null()], { default: 1 }),
  sksPraktekLapangan: t.Optional(t.Union([t.Integer(), t.Null()])),
  sksSimulasi: t.Optional(t.Union([t.Integer(), t.Null()])),
  idPddikti: t.Union([t.String(), t.Null()], { default: null }),
  isSynced: t.Boolean({ default: false }),
  lastSyncAt: t.Any(),
  createdAt: t.Any(),
  updatedAt: t.Any(),
};

export const getMataKuliahSchema = {
  detail: {
    tags: ['Mata Kuliah'],
    summary: 'Daftar Mata Kuliah',
    description: 'Mengambil semua data mata kuliah dengan filter program studi, kurikulum, semester, dan sorting.',
  },
  query: t.Object({
    page: t.Optional(t.Numeric({ default: 1 })),
    limit: t.Optional(t.Numeric({ default: 10 })),
    search: t.Optional(t.String({ default: '' })),
    programStudiId: t.Optional(t.Numeric()),
    kurikulumId: t.Optional(t.Numeric()),
    semester: t.Optional(t.Numeric()),
    sortBy: t.Optional(t.String({ default: 'nama' })),
    sortOrder: t.Optional(t.String({ default: 'asc' })),
  }),
  response: {
    200: t.Object({
      data: t.Array(
        t.Object({
          ...mataKuliahResponseFields,
          semester: t.Union([t.Integer(), t.Null()], { default: null }),
          programStudi: t.Union([
            t.Object({
              id: t.Integer(),
              kode: t.String(),
              nama: t.String(),
            }),
            t.Null(),
          ]),
          kurikulum: t.Optional(
            t.Union([
              t.Object({
                kode: t.String(),
                nama: t.String(),
              }),
              t.Null(),
            ]),
          ),
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

export const createMataKuliahSchema = {
  detail: {
    tags: ['Mata Kuliah'],
    summary: 'Tambah Mata Kuliah Baru',
    description: 'Menambahkan mata kuliah baru untuk program studi tertentu (Hanya dapat diakses Admin).',
  },
  body: mataKuliahBody,
  response: {
    201: t.Object(mataKuliahResponseFields),
    403: t.Object({
      error: t.String({ default: 'Akses ditolak. Hanya Admin.' }),
    }),
  },
};

export const getMataKuliahByIdSchema = {
  detail: {
    tags: ['Mata Kuliah'],
    summary: 'Detail Mata Kuliah',
    description: 'Mengambil satu data mata kuliah berdasarkan ID.',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
  response: {
    200: t.Object(mataKuliahResponseFields),
    404: t.Object({
      error: t.String({ default: 'Data tidak ditemukan' }),
    }),
  },
};

export const updateMataKuliahSchema = {
  detail: {
    tags: ['Mata Kuliah'],
    summary: 'Perbarui Mata Kuliah',
    description: 'Memperbarui data mata kuliah berdasarkan ID (Hanya dapat diakses oleh Admin).',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
  body: updateMataKuliahBody,
  response: {
    200: t.Object(mataKuliahResponseFields),
    403: t.Object({
      error: t.String({ default: 'Akses ditolak. Hanya Admin.' }),
    }),
    404: t.Object({
      error: t.String({ default: 'Data tidak ditemukan' }),
    }),
  },
};

export const importMataKuliahBody = t.Object({
  items: t.Array(
    t.Object({
      kodeProdi: t.Optional(t.String()),
      kode: t.String(),
      nama: t.String(),
      sksTotal: t.Integer(),
      sksTatapMuka: t.Optional(t.Integer()),
      sksPraktek: t.Optional(t.Integer()),
      idPddikti: t.Optional(t.String()),
    }),
  ),
});

export const importMataKuliahSchema = {
  detail: {
    tags: ['Mata Kuliah'],
    summary: 'Impor Mata Kuliah dari CSV',
    description: 'Mengimpor data mata kuliah secara massal dari file CSV.',
  },
  body: importMataKuliahBody,
  response: {
    200: t.Object({
      success: t.Integer(),
      failed: t.Integer(),
      errors: t.Array(
        t.Object({
          row: t.Integer(),
          kode: t.String(),
          error: t.String(),
        }),
      ),
    }),
    400: t.Object({ error: t.String() }),
  },
};

export const getTemplateMataKuliahSchema = {
  detail: {
    tags: ['Mata Kuliah'],
    summary: 'Download Template CSV Mata Kuliah',
    description: 'Download template CSV untuk import Mata Kuliah.',
  },
};

export const deleteMataKuliahSchema = {
  detail: {
    tags: ['Mata Kuliah'],
    summary: 'Hapus Mata Kuliah',
    description: 'Menghapus data mata kuliah berdasarkan ID (Hanya dapat diakses oleh Admin).',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
  response: {
    200: t.Object({
      message: t.String({ default: 'Mata Kuliah berhasil dihapus' }),
    }),
    403: t.Object({
      error: t.String({ default: 'Akses ditolak. Hanya Admin.' }),
    }),
    404: t.Object({
      error: t.String({ default: 'Data tidak ditemukan' }),
    }),
  },
};

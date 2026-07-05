import { t } from 'elysia';

export const kurikulumBody = t.Object({
  kode: t.String({ default: 'KUR-2024' }),
  nama: t.String({ default: 'Kurikulum 2024 Teknik Informatika' }),
  programStudiId: t.Integer({ default: 1 }),
  semesterMulai: t.String({ default: '20241' }),
  jumlahSksLulus: t.Integer({ default: 144 }),
  jumlahSksWajib: t.Integer({ default: 120 }),
  jumlahSksPilihan: t.Integer({ default: 24 }),
  isAktif: t.Optional(t.Boolean({ default: false })),
  idPddikti: t.Optional(t.String()),
});

export const addMataKuliahBody = t.Object({
  mataKuliahId: t.Integer({ default: 1 }),
  semester: t.Integer({ default: 1 }),
  sksMataKuliah: t.Integer({ default: 3 }),
  sksTatapMuka: t.Optional(t.Integer({ default: 2 })),
  sksPraktek: t.Optional(t.Integer({ default: 1 })),
  sksPraktekLapangan: t.Optional(t.Integer({ default: 0 })),
  sksSimulasi: t.Optional(t.Integer({ default: 0 })),
  isWajib: t.Optional(t.Boolean({ default: true })),
});

export const getKurikulumSchema = {
  detail: {
    tags: ['Kurikulum'],
    summary: 'Daftar Kurikulum',
    description: 'Mengambil semua data kurikulum dengan pagination, filter pencarian, dan program studi.',
  },
  query: t.Object({
    page: t.Optional(t.Numeric({ default: 1 })),
    limit: t.Optional(t.Numeric({ default: 10 })),
    search: t.Optional(t.String({ default: '' })),
    prodiId: t.Optional(t.Numeric()),
  }),
};

export const getKurikulumByIdSchema = {
  detail: {
    tags: ['Kurikulum'],
    summary: 'Detail Kurikulum',
    description: 'Mengambil satu data kurikulum berdasarkan ID beserta relasi program studi dan daftar mata kuliah.',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
};

export const createKurikulumSchema = {
  detail: {
    tags: ['Kurikulum'],
    summary: 'Tambah Kurikulum Baru',
    description: 'Menambahkan kurikulum baru (Hanya dapat diakses Admin).',
  },
  body: kurikulumBody,
};

export const updateKurikulumSchema = {
  detail: {
    tags: ['Kurikulum'],
    summary: 'Perbarui Kurikulum',
    description: 'Memperbarui data kurikulum berdasarkan ID (Hanya dapat diakses Admin).',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
  body: t.Partial(kurikulumBody),
};

export const deleteKurikulumSchema = {
  detail: {
    tags: ['Kurikulum'],
    summary: 'Hapus Kurikulum',
    description: 'Menghapus data kurikulum berdasarkan ID (Hanya dapat diakses Admin).',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
};

export const addMataKuliahSchema = {
  detail: {
    tags: ['Kurikulum'],
    summary: 'Tambahkan Mata Kuliah ke Kurikulum',
    description: 'Menambahkan mata kuliah ke kurikulum tertentu (Hanya dapat diakses Admin).',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
  body: addMataKuliahBody,
};

export const removeMataKuliahSchema = {
  detail: {
    tags: ['Kurikulum'],
    summary: 'Hapus Mata Kuliah dari Kurikulum',
    description: 'Menghapus mata kuliah dari kurikulum tertentu (Hanya dapat diakses Admin).',
  },
  params: t.Object({
    id: t.Numeric(),
    mkId: t.Numeric(),
  }),
};

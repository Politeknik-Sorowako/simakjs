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

export const copyFromKurikulumSchema = {
  detail: {
    tags: ['Kurikulum'],
    summary: 'Salin Mata Kuliah dari Kurikulum Lain',
    description:
      'Menyalin daftar mata kuliah dari kurikulum sumber ke kurikulum target. Skip jika sudah ada (Hanya Admin).',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
  body: t.Object({
    sourceKurikulumId: t.Integer({ default: 1 }),
  }),
  response: {
    200: t.Object({
      copied: t.Integer({ default: 0 }),
      skipped: t.Integer({ default: 0 }),
      sourceKode: t.String(),
      sourceNama: t.String(),
    }),
    400: t.Object({
      error: t.String({ default: 'Kurikulum sumber tidak ditemukan' }),
    }),
  },
};

export const duplicateKurikulumSchema = {
  detail: {
    tags: ['Kurikulum'],
    summary: 'Duplikasi Kurikulum',
    description: 'Menduplikasi kurikulum beserta seluruh mata kuliah di dalamnya (Hanya Admin).',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
  body: t.Object({
    kodeBaru: t.String({ default: 'KUR-2025-DUP' }),
    namaBaru: t.String({ default: 'Duplikat Kurikulum 2024' }),
  }),
  response: {
    201: t.Object({
      id: t.Integer(),
      kode: t.String(),
      nama: t.String(),
    }),
  },
};

export const importMkCsvSchema = {
  detail: {
    tags: ['Kurikulum'],
    summary: 'Impor Mata Kuliah CSV ke Kurikulum',
    description: 'Mengimpor daftar mata kuliah dari file CSV ke dalam kurikulum (Hanya Admin).',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
  response: {
    200: t.Object({
      imported: t.Integer({ default: 0 }),
      skipped: t.Integer({ default: 0 }),
      errors: t.Array(
        t.Object({
          baris: t.Integer(),
          pesan: t.String(),
        }),
      ),
    }),
  },
};

export const downloadTemplateImportMkSchema = {
  detail: {
    tags: ['Kurikulum'],
    summary: 'Download Template CSV Impor Mata Kuliah',
    description: 'Mengunduh template CSV untuk impor mata kuliah ke kurikulum.',
  },
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

export const removeBatchMataKuliahSchema = {
  detail: {
    tags: ['Kurikulum'],
    summary: 'Hapus Massal Mata Kuliah dari Kurikulum',
    description: 'Menghapus beberapa mata kuliah dari kurikulum sekaligus (Hanya Admin).',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
  body: t.Object({
    mataKuliahIds: t.Array(t.Integer()),
  }),
};

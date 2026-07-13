import { t } from 'elysia';

export const bahanKajianBody = t.Object({
  programStudiId: t.Integer({ default: 1 }),
  kode: t.String({ default: 'BK-1' }),
  nama: t.String({ default: 'Nama Bahan Kajian' }),
  deskripsi: t.Optional(t.String()),
  urutan: t.Optional(t.Integer({ default: 0 })),
});

export const getBahanKajianSchema = {
  detail: {
    tags: ['Bahan Kajian'],
    summary: 'Daftar Bahan Kajian',
    description: 'Mengambil semua data Bahan Kajian berdasarkan program studi.',
  },
  query: t.Object({
    prodiId: t.Optional(t.Numeric()),
  }),
};

export const getBahanKajianByIdSchema = {
  detail: {
    tags: ['Bahan Kajian'],
    summary: 'Detail Bahan Kajian',
    description: 'Mengambil satu data Bahan Kajian berdasarkan ID beserta mapping CPL.',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
};

export const createBahanKajianSchema = {
  detail: {
    tags: ['Bahan Kajian'],
    summary: 'Tambah Bahan Kajian Baru',
    description: 'Menambahkan Bahan Kajian baru (Hanya Admin/Prodi).',
  },
  body: bahanKajianBody,
};

export const updateBahanKajianSchema = {
  detail: {
    tags: ['Bahan Kajian'],
    summary: 'Perbarui Bahan Kajian',
    description: 'Memperbarui data Bahan Kajian berdasarkan ID.',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
  body: t.Partial(bahanKajianBody),
};

export const deleteBahanKajianSchema = {
  detail: {
    tags: ['Bahan Kajian'],
    summary: 'Hapus Bahan Kajian',
    description: 'Menghapus data Bahan Kajian berdasarkan ID (Hanya Admin).',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
};

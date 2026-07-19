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
  body: t.Object({
    kode: t.Optional(t.String()),
    nama: t.Optional(t.String()),
    deskripsi: t.Optional(t.String()),
    urutan: t.Optional(t.Integer()),
  }),
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

export const importBahanKajianSchema = {
  detail: {
    tags: ['Bahan Kajian'],
    summary: 'Impor Bahan Kajian dari CSV',
    description: 'Impor data Bahan Kajian dari file CSV. Format: kode_prodi,kode,nama,deskripsi (Hanya Admin/Prodi).',
  },
  body: t.Object({
    programStudiId: t.Optional(t.Integer()),
    items: t.Array(
      t.Object({
        kodeProdi: t.Optional(t.String()),
        kode: t.String(),
        nama: t.String(),
        deskripsi: t.Optional(t.String()),
      }),
    ),
  }),
};

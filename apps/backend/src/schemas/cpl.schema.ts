import { t } from 'elysia';

export const cplBody = t.Object({
  programStudiId: t.Integer({ default: 1 }),
  kode: t.String({ default: 'CPL-1' }),
  deskripsi: t.String({ default: 'Deskripsi CPL' }),
  urutan: t.Optional(t.Integer({ default: 0 })),
});

export const getCplSchema = {
  detail: {
    tags: ['CPL'],
    summary: 'Daftar CPL',
    description: 'Mengambil semua data CPL berdasarkan program studi.',
  },
  query: t.Object({
    prodiId: t.Optional(t.Numeric()),
  }),
};

export const getCplByIdSchema = {
  detail: {
    tags: ['CPL'],
    summary: 'Detail CPL',
    description: 'Mengambil satu data CPL berdasarkan ID beserta mapping profil lulusan.',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
};

export const createCplSchema = {
  detail: {
    tags: ['CPL'],
    summary: 'Tambah CPL Baru',
    description: 'Menambahkan CPL baru (Hanya Admin/Prodi).',
  },
  body: cplBody,
};

export const updateCplSchema = {
  detail: {
    tags: ['CPL'],
    summary: 'Perbarui CPL',
    description: 'Memperbarui data CPL berdasarkan ID.',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
  body: t.Partial(cplBody),
};

export const deleteCplSchema = {
  detail: {
    tags: ['CPL'],
    summary: 'Hapus CPL',
    description: 'Menghapus data CPL berdasarkan ID (Hanya Admin).',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
};

export const importCplSchema = {
  detail: {
    tags: ['CPL'],
    summary: 'Impor CPL dari CSV',
    description: 'Impor data CPL dari file CSV. Format: kode,deskripsi (Hanya Admin/Prodi).',
  },
  body: t.Object({
    programStudiId: t.Integer(),
    items: t.Array(
      t.Object({
        kode: t.String(),
        deskripsi: t.String(),
      }),
    ),
  }),
};

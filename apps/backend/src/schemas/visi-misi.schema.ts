import { t } from 'elysia';

export const visiMisiBody = t.Object({
  programStudiId: t.Integer({ default: 1 }),
  visi: t.String({ default: 'Visi program studi' }),
  misi: t.String({ default: 'Misi program studi' }),
  tujuan: t.Optional(t.String()),
  sasaran: t.Optional(t.String()),
  tahunBerlaku: t.Optional(t.String({ default: '2024' })),
  isAktif: t.Optional(t.Boolean({ default: false })),
});

export const getVisiMisiSchema = {
  detail: {
    tags: ['Visi Misi Prodi'],
    summary: 'Daftar Visi Misi Prodi',
    description: 'Mengambil semua data Visi Misi berdasarkan program studi.',
  },
  query: t.Object({
    prodiId: t.Optional(t.Numeric()),
  }),
};

export const getVisiMisiAktifSchema = {
  detail: {
    tags: ['Visi Misi Prodi'],
    summary: 'Visi Misi Aktif',
    description: 'Mengambil Visi Misi yang aktif untuk program studi tertentu.',
  },
  query: t.Object({
    prodiId: t.Numeric(),
  }),
};

export const getVisiMisiByIdSchema = {
  detail: {
    tags: ['Visi Misi Prodi'],
    summary: 'Detail Visi Misi',
    description: 'Mengambil satu data Visi Misi berdasarkan ID.',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
};

export const createVisiMisiSchema = {
  detail: {
    tags: ['Visi Misi Prodi'],
    summary: 'Tambah Visi Misi Baru',
    description: 'Menambahkan Visi Misi baru (Hanya Admin/Prodi).',
  },
  body: visiMisiBody,
};

export const updateVisiMisiSchema = {
  detail: {
    tags: ['Visi Misi Prodi'],
    summary: 'Perbarui Visi Misi',
    description: 'Memperbarui data Visi Misi berdasarkan ID.',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
  body: t.Object({
    visi: t.Optional(t.String()),
    misi: t.Optional(t.String()),
    tujuan: t.Optional(t.String()),
    sasaran: t.Optional(t.String()),
    tahunBerlaku: t.Optional(t.String()),
  }),
};

export const deleteVisiMisiSchema = {
  detail: {
    tags: ['Visi Misi Prodi'],
    summary: 'Hapus Visi Misi',
    description: 'Menghapus data Visi Misi berdasarkan ID (Hanya Admin).',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
};

export const setVisiMisiAktifSchema = {
  detail: {
    tags: ['Visi Misi Prodi'],
    summary: 'Set Visi Misi Aktif',
    description: 'Menetapkan Visi Misi sebagai versi aktif (menonaktifkan yang lain) (Hanya Admin/Prodi).',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
};

export const importVisiMisiSchema = {
  detail: {
    tags: ['Visi Misi Prodi'],
    summary: 'Impor Visi Misi dari CSV',
    description:
      'Impor data Visi Misi dari file CSV. Format: tahunBerlaku,visi,misi,tujuan,sasaran (Hanya Admin/Prodi).',
  },
  body: t.Object({
    programStudiId: t.Integer(),
    items: t.Array(
      t.Object({
        tahunBerlaku: t.String(),
        visi: t.String(),
        misi: t.String(),
        tujuan: t.Optional(t.String()),
        sasaran: t.Optional(t.String()),
      }),
    ),
  }),
};

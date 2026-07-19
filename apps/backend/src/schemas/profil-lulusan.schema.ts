import { t } from 'elysia';

export const profilLulusanBody = t.Object({
  programStudiId: t.Integer({ default: 1 }),
  kode: t.String({ default: 'PL-1' }),
  deskripsi: t.String({ default: 'Deskripsi Profil Lulusan' }),
  urutan: t.Optional(t.Integer({ default: 0 })),
});

export const getProfilLulusanSchema = {
  detail: {
    tags: ['Profil Lulusan'],
    summary: 'Daftar Profil Lulusan',
    description: 'Mengambil semua data Profil Lulusan berdasarkan program studi.',
  },
  query: t.Object({
    prodiId: t.Optional(t.Numeric()),
  }),
};

export const getProfilLulusanByIdSchema = {
  detail: {
    tags: ['Profil Lulusan'],
    summary: 'Detail Profil Lulusan',
    description: 'Mengambil satu data Profil Lulusan berdasarkan ID.',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
};

export const createProfilLulusanSchema = {
  detail: {
    tags: ['Profil Lulusan'],
    summary: 'Tambah Profil Lulusan Baru',
    description: 'Menambahkan Profil Lulusan baru (Hanya Admin/Prodi).',
  },
  body: profilLulusanBody,
};

export const updateProfilLulusanSchema = {
  detail: {
    tags: ['Profil Lulusan'],
    summary: 'Perbarui Profil Lulusan',
    description: 'Memperbarui data Profil Lulusan berdasarkan ID.',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
  body: t.Object({
    kode: t.Optional(t.String()),
    deskripsi: t.Optional(t.String()),
    urutan: t.Optional(t.Integer()),
  }),
};

export const deleteProfilLulusanSchema = {
  detail: {
    tags: ['Profil Lulusan'],
    summary: 'Hapus Profil Lulusan',
    description: 'Menghapus data Profil Lulusan berdasarkan ID (Hanya Admin).',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
};

export const importProfilLulusanSchema = {
  detail: {
    tags: ['Profil Lulusan'],
    summary: 'Impor Profil Lulusan dari CSV',
    description: 'Impor data Profil Lulusan dari file CSV. Format: kode_prodi,kode,deskripsi (Hanya Admin/Prodi).',
  },
  body: t.Object({
    programStudiId: t.Optional(t.Integer()),
    items: t.Array(
      t.Object({
        kodeProdi: t.Optional(t.String()),
        kode: t.String(),
        deskripsi: t.String(),
      }),
    ),
  }),
};

import { t } from 'elysia';

export const angkatanKurikulumBody = t.Object({
  programStudiId: t.Integer({ default: 1 }),
  angkatan: t.String({ default: '2024' }),
  kurikulumId: t.Integer({ default: 1 }),
  isActive: t.Optional(t.Boolean({ default: true })),
});

export const updateAngkatanKurikulumBody = t.Partial(
  t.Object({
    programStudiId: t.Integer(),
    angkatan: t.String(),
    kurikulumId: t.Integer(),
    isActive: t.Boolean(),
  }),
);

export const getAngkatanKurikulumSchema = {
  detail: {
    tags: ['Angkatan Kurikulum'],
    summary: 'Daftar Binding Angkatan Kurikulum',
    description: 'Mengambil semua data binding angkatan ke kurikulum dengan filter prodi.',
  },
  query: t.Object({
    programStudiId: t.Optional(t.Numeric()),
  }),
  response: {
    200: t.Array(
      t.Object({
        id: t.Integer({ default: 1 }),
        programStudiId: t.Integer({ default: 1 }),
        angkatan: t.String({ default: '2024' }),
        kurikulumId: t.Integer({ default: 1 }),
        isActive: t.Boolean({ default: true }),
        createdAt: t.Any(),
        updatedAt: t.Any(),
        programStudi: t.Union([
          t.Object({
            id: t.Integer(),
            kode: t.String(),
            nama: t.String(),
            jenjang: t.String(),
          }),
          t.Null(),
        ]),
        kurikulum: t.Union([
          t.Object({
            id: t.Integer(),
            kode: t.String(),
            nama: t.String(),
          }),
          t.Null(),
        ]),
      }),
    ),
  },
};

export const getAngkatanKurikulumAktifSchema = {
  detail: {
    tags: ['Angkatan Kurikulum'],
    summary: 'Kurikulum Aktif untuk Mahasiswa',
    description: 'Mengambil kurikulum aktif berdasarkan program studi dan angkatan.',
  },
  query: t.Object({
    programStudiId: t.Numeric(),
    angkatan: t.String(),
  }),
  response: {
    200: t.Object({
      id: t.Integer({ default: 1 }),
      kode: t.String({ default: 'KUR-2024' }),
      nama: t.String({ default: 'Kurikulum 2024' }),
      programStudiId: t.Integer({ default: 1 }),
      isAktif: t.Boolean({ default: true }),
      kurikulumMataKuliah: t.Array(
        t.Object({
          id: t.Integer(),
          mataKuliahId: t.Integer(),
          semester: t.Integer(),
          sksMataKuliah: t.Integer(),
          isWajib: t.Boolean(),
          mataKuliah: t.Union([
            t.Object({
              id: t.Integer(),
              kode: t.String(),
              nama: t.String(),
              sksTotal: t.Integer(),
            }),
            t.Null(),
          ]),
        }),
      ),
    }),
    404: t.Object({
      error: t.String({ default: 'Tidak ada kurikulum aktif untuk angkatan ini' }),
    }),
  },
};

export const createAngkatanKurikulumSchema = {
  detail: {
    tags: ['Angkatan Kurikulum'],
    summary: 'Binding Angkatan ke Kurikulum',
    description: 'Mengikat angkatan ke kurikulum tertentu (Hanya Admin).',
  },
  body: angkatanKurikulumBody,
  response: {
    201: t.Object({
      id: t.Integer({ default: 1 }),
      programStudiId: t.Integer({ default: 1 }),
      angkatan: t.String({ default: '2024' }),
      kurikulumId: t.Integer({ default: 1 }),
      isActive: t.Boolean({ default: true }),
      createdAt: t.Any(),
      updatedAt: t.Any(),
    }),
    403: t.Object({
      error: t.String({ default: 'Akses ditolak. Hanya Admin.' }),
    }),
    409: t.Object({
      error: t.String({ default: 'Kurikulum sudah di-lock oleh binding lain' }),
    }),
  },
};

export const updateAngkatanKurikulumSchema = {
  detail: {
    tags: ['Angkatan Kurikulum'],
    summary: 'Update Binding Angkatan Kurikulum',
    description: 'Mengubah binding angkatan ke kurikulum lain (Hanya Admin).',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
  body: updateAngkatanKurikulumBody,
  response: {
    200: t.Object({
      id: t.Integer({ default: 1 }),
      programStudiId: t.Integer({ default: 1 }),
      angkatan: t.String({ default: '2024' }),
      kurikulumId: t.Integer({ default: 1 }),
      isActive: t.Boolean({ default: true }),
      createdAt: t.Any(),
      updatedAt: t.Any(),
    }),
    403: t.Object({
      error: t.String({ default: 'Akses ditolak. Hanya Admin.' }),
    }),
    404: t.Object({
      error: t.String({ default: 'Data tidak ditemukan' }),
    }),
  },
};

export const deleteAngkatanKurikulumSchema = {
  detail: {
    tags: ['Angkatan Kurikulum'],
    summary: 'Hapus Binding Angkatan Kurikulum',
    description: 'Menghapus binding angkatan ke kurikulum (Hanya Admin).',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
  response: {
    200: t.Object({
      message: t.String({ default: 'Binding Angkatan Kurikulum berhasil dihapus' }),
    }),
    403: t.Object({
      error: t.String({ default: 'Akses ditolak. Hanya Admin.' }),
    }),
    404: t.Object({
      error: t.String({ default: 'Data tidak ditemukan' }),
    }),
  },
};

import { t } from 'elysia';

const programStudiFields = {
  id: t.Integer({ default: 1 }),
  kode: t.String({ default: 'TI' }),
  nama: t.String({ default: 'Teknik Informatika' }),
  jenjang: t.String({ default: 'D4' }),
  idPddikti: t.Union([t.String(), t.Null()], { default: null }),
  isSynced: t.Union([t.Boolean(), t.Null()], { default: false }),
  lastSyncAt: t.Union([t.String(), t.Null()], { default: null }),
  createdAt: t.Union([t.String(), t.Null()], { default: null }),
  updatedAt: t.Union([t.String(), t.Null()], { default: null }),
};

const cplFields = {
  id: t.Integer({ default: 1 }),
  programStudiId: t.Integer({ default: 1 }),
  kode: t.String({ default: 'CPL-1' }),
  deskripsi: t.String({ default: 'Deskripsi CPL' }),
  urutan: t.Integer({ default: 0 }),
  createdAt: t.Union([t.String(), t.Null()], { default: null }),
  updatedAt: t.Union([t.String(), t.Null()], { default: null }),
};

const programStudiObj = t.Object({ ...programStudiFields });

const profilLulusanObj = t.Object({
  id: t.Integer({ default: 1 }),
  programStudiId: t.Integer({ default: 1 }),
  kode: t.String({ default: 'PL-1' }),
  deskripsi: t.String({ default: 'Deskripsi Profil Lulusan' }),
  urutan: t.Integer({ default: 0 }),
  createdAt: t.Union([t.String(), t.Null()], { default: null }),
  updatedAt: t.Union([t.String(), t.Null()], { default: null }),
});

const mataKuliahObj = t.Object({
  id: t.Integer({ default: 1 }),
  kode: t.String({ default: 'MK-1' }),
  nama: t.String({ default: 'Nama Mata Kuliah' }),
});

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
  response: {
    200: t.Array(
      t.Object({
        ...cplFields,
        programStudi: t.Optional(programStudiObj),
      }),
    ),
  },
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
  response: {
    200: t.Object({
      ...cplFields,
      programStudi: t.Optional(programStudiObj),
      profilLulusanMappings: t.Array(
        t.Object({
          id: t.Integer({ default: 1 }),
          cplId: t.Integer({ default: 1 }),
          profilLulusanId: t.Integer({ default: 1 }),
          bobot: t.Union([t.String(), t.Null()], { default: null }),
          createdAt: t.Union([t.String(), t.Null()], { default: null }),
          updatedAt: t.Union([t.String(), t.Null()], { default: null }),
          profilLulusan: t.Optional(profilLulusanObj),
        }),
      ),
      cpmkMappings: t.Array(
        t.Object({
          id: t.Integer({ default: 1 }),
          cpmkId: t.Integer({ default: 1 }),
          cplId: t.Integer({ default: 1 }),
          bobot: t.Union([t.String(), t.Null()], { default: null }),
          createdAt: t.Union([t.String(), t.Null()], { default: null }),
          updatedAt: t.Union([t.String(), t.Null()], { default: null }),
          cpmk: t.Optional(
            t.Object({
              id: t.Integer({ default: 1 }),
              mataKuliahId: t.Integer({ default: 1 }),
              kurikulumMataKuliahId: t.Union([t.Integer(), t.Null()], { default: null }),
              kode: t.String({ default: 'CPMK-1' }),
              deskripsi: t.String({ default: 'Deskripsi CPMK' }),
              bobotMk: t.Union([t.String(), t.Null()], { default: null }),
              createdAt: t.Union([t.String(), t.Null()], { default: null }),
              updatedAt: t.Union([t.String(), t.Null()], { default: null }),
              mataKuliah: t.Optional(mataKuliahObj),
            }),
          ),
        }),
      ),
    }),
    404: t.Object({
      error: t.String({ default: 'Data tidak ditemukan' }),
    }),
  },
};

export const createCplSchema = {
  detail: {
    tags: ['CPL'],
    summary: 'Tambah CPL Baru',
    description: 'Menambahkan CPL baru (Hanya Admin/Prodi).',
  },
  body: cplBody,
  response: {
    201: t.Object({ ...cplFields }),
    403: t.Object({
      error: t.String({ default: 'Akses ditolak.' }),
    }),
  },
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
  body: t.Object({
    kode: t.Optional(t.String()),
    deskripsi: t.Optional(t.String()),
    urutan: t.Optional(t.Integer()),
  }),
  response: {
    200: t.Object({ ...cplFields }),
    403: t.Object({
      error: t.String({ default: 'Akses ditolak.' }),
    }),
    404: t.Object({
      error: t.String({ default: 'Data tidak ditemukan' }),
    }),
  },
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
  response: {
    200: t.Object({
      message: t.String({ default: 'CPL berhasil dihapus' }),
    }),
    403: t.Object({
      error: t.String({ default: 'Akses ditolak. Hanya Admin.' }),
    }),
    404: t.Object({
      error: t.String({ default: 'Data tidak ditemukan' }),
    }),
  },
};

export const importCplSchema = {
  detail: {
    tags: ['CPL'],
    summary: 'Impor CPL dari CSV',
    description: 'Impor data CPL dari file CSV. Format: kode_prodi,kode,deskripsi (Hanya Admin/Prodi).',
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
  response: {
    200: t.Object({
      success: t.Integer({ default: 1 }),
      failed: t.Integer({ default: 0 }),
      errors: t.Array(
        t.Object({
          row: t.Integer({ default: 1 }),
          kode: t.String({ default: 'CPL-01' }),
          error: t.String({ default: 'Message' }),
        }),
      ),
    }),
    400: t.Object({
      error: t.String({ default: 'Data CPL harus diisi' }),
    }),
    403: t.Object({
      error: t.String({ default: 'Akses ditolak.' }),
    }),
  },
};

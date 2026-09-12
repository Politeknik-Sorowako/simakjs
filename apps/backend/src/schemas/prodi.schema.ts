import { t } from 'elysia';

export const prodiBody = t.Object({
  kode: t.String({ default: 'TI' }),
  nama: t.String({ default: 'Teknik Informatika' }),
  jenjang: t.String({ default: 'D4' }),
  idPddikti: t.Optional(t.Union([t.String(), t.Null()])),
  kodeProdiPddikti: t.Optional(t.Union([t.String(), t.Null()])),
  nomorSkIzinOperasional: t.Optional(t.Union([t.String(), t.Null()])),
  tanggalSkIzinOperasional: t.Optional(t.Union([t.String(), t.Null()])),
  tanggalSkIzinOperasionalBerlakuMulai: t.Optional(t.Union([t.String(), t.Null()])),
  fileSkIzinOperasional: t.Optional(t.Union([t.String(), t.Null()])),
  nilaiAkreditasi: t.Optional(t.Union([t.String(), t.Null()])),
  tanggalSkAkreditasi: t.Optional(t.Union([t.String(), t.Null()])),
  tanggalSkAkreditasiBerlakuMulai: t.Optional(t.Union([t.String(), t.Null()])),
  fileSkAkreditasi: t.Optional(t.Union([t.String(), t.Null()])),
});

export const updateProdiBody = t.Partial(
  t.Object({
    kode: t.String(),
    nama: t.String(),
    jenjang: t.String(),
    idPddikti: t.Union([t.String(), t.Null()]),
    kodeProdiPddikti: t.Union([t.String(), t.Null()]),
    nomorSkIzinOperasional: t.Union([t.String(), t.Null()]),
    tanggalSkIzinOperasional: t.Union([t.String(), t.Null()]),
    tanggalSkIzinOperasionalBerlakuMulai: t.Union([t.String(), t.Null()]),
    fileSkIzinOperasional: t.Union([t.String(), t.Null()]),
    nilaiAkreditasi: t.Union([t.String(), t.Null()]),
    tanggalSkAkreditasi: t.Union([t.String(), t.Null()]),
    tanggalSkAkreditasiBerlakuMulai: t.Union([t.String(), t.Null()]),
    fileSkAkreditasi: t.Union([t.String(), t.Null()]),
  }),
);

export const prodiExtraResponseFields = {
  kodeProdiPddikti: t.Union([t.String(), t.Null()], { default: null }),
  nomorSkIzinOperasional: t.Union([t.String(), t.Null()], { default: null }),
  tanggalSkIzinOperasional: t.Union([t.String(), t.Null()], { default: null }),
  tanggalSkIzinOperasionalBerlakuMulai: t.Union([t.String(), t.Null()], { default: null }),
  fileSkIzinOperasional: t.Union([t.String(), t.Null()], { default: null }),
  nilaiAkreditasi: t.Union([t.String(), t.Null()], { default: null }),
  tanggalSkAkreditasi: t.Union([t.String(), t.Null()], { default: null }),
  tanggalSkAkreditasiBerlakuMulai: t.Union([t.String(), t.Null()], { default: null }),
  fileSkAkreditasi: t.Union([t.String(), t.Null()], { default: null }),
};

export const getProdiSchema = {
  detail: {
    tags: ['Program Studi'],
    summary: 'Daftar Program Studi',
    description: 'Mengambil semua data program studi yang terdaftar dengan pagination dan filter pencarian.',
  },
  query: t.Object({
    page: t.Optional(t.Numeric({ default: 1 })),
    limit: t.Optional(t.Numeric({ default: 10 })),
    search: t.Optional(t.String({ default: '' })),
  }),
  response: {
    200: t.Object({
      data: t.Array(
        t.Object({
          id: t.Integer({ default: 1 }),
          kode: t.String({ default: 'TI' }),
          nama: t.String({ default: 'Teknik Informatika' }),
          jenjang: t.String({ default: 'D4' }),
          idPddikti: t.Union([t.String(), t.Null()], { default: null }),
          ...prodiExtraResponseFields,
          isSynced: t.Union([t.Boolean(), t.Null()], { default: false }),
          lastSyncAt: t.Union([t.Date(), t.Null()], { default: null }),
          createdAt: t.Union([t.Date(), t.Null()], { default: null }),
          updatedAt: t.Union([t.Date(), t.Null()], { default: null }),
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

export const createProdiSchema = {
  detail: {
    tags: ['Program Studi'],
    summary: 'Tambah Program Studi Baru',
    description: 'Menambahkan prodi baru (Hanya dapat diakses oleh Admin yang menyertakan token JWT).',
  },
  body: prodiBody,
  response: {
    201: t.Object({
      id: t.Integer({ default: 1 }),
      kode: t.String({ default: 'TI' }),
      nama: t.String({ default: 'Teknik Informatika' }),
      jenjang: t.String({ default: 'D4' }),
      idPddikti: t.Union([t.String(), t.Null()], { default: null }),
      ...prodiExtraResponseFields,
      isSynced: t.Boolean({ default: false }),
      lastSyncAt: t.Union([t.Date(), t.Null()], { default: null }),
      createdAt: t.Union([t.Date(), t.Null()], { default: null }),
      updatedAt: t.Union([t.Date(), t.Null()], { default: null }),
    }),
    403: t.Object({
      error: t.String({ default: 'Akses ditolak. Hanya Admin.' }),
    }),
  },
};

export const getProdiByIdSchema = {
  detail: {
    tags: ['Program Studi'],
    summary: 'Detail Program Studi',
    description: 'Mengambil satu data program studi berdasarkan ID.',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
  response: {
    200: t.Object({
      id: t.Integer({ default: 1 }),
      kode: t.String({ default: 'TI' }),
      nama: t.String({ default: 'Teknik Informatika' }),
      jenjang: t.String({ default: 'D4' }),
      idPddikti: t.Union([t.String(), t.Null()], { default: null }),
      ...prodiExtraResponseFields,
      isSynced: t.Boolean({ default: false }),
      lastSyncAt: t.Union([t.Date(), t.Null()], { default: null }),
      createdAt: t.Union([t.Date(), t.Null()], { default: null }),
      updatedAt: t.Union([t.Date(), t.Null()], { default: null }),
    }),
    404: t.Object({
      error: t.String({ default: 'Data tidak ditemukan' }),
    }),
  },
};

export const updateProdiSchema = {
  detail: {
    tags: ['Program Studi'],
    summary: 'Perbarui Program Studi',
    description: 'Memperbarui data program studi berdasarkan ID (Hanya dapat diakses oleh Admin).',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
  body: updateProdiBody,
  response: {
    200: t.Object({
      id: t.Integer({ default: 1 }),
      kode: t.String({ default: 'TI' }),
      nama: t.String({ default: 'Teknik Informatika' }),
      jenjang: t.String({ default: 'D4' }),
      idPddikti: t.Union([t.String(), t.Null()], { default: null }),
      ...prodiExtraResponseFields,
      isSynced: t.Boolean({ default: false }),
      lastSyncAt: t.Union([t.Date(), t.Null()], { default: null }),
      createdAt: t.Union([t.Date(), t.Null()], { default: null }),
      updatedAt: t.Union([t.Date(), t.Null()], { default: null }),
    }),
    403: t.Object({
      error: t.String({ default: 'Akses ditolak. Hanya Admin.' }),
    }),
    404: t.Object({
      error: t.String({ default: 'Data tidak ditemukan' }),
    }),
  },
};

export const uploadSkSchema = {
  detail: {
    tags: ['Program Studi'],
    summary: 'Unggah Dokumen SK Prodi',
    description: 'Mengunggah berkas SK Izin Operasional atau SK Akreditasi program studi (PDF/Gambar).',
  },
};

export const importProdiSchema = {
  detail: {
    tags: ['Program Studi'],
    summary: 'Impor Program Studi dari CSV',
    description: 'Mengimpor data program studi secara massal dari file CSV.',
  },
};

export const deleteProdiSchema = {
  detail: {
    tags: ['Program Studi'],
    summary: 'Hapus Program Studi',
    description: 'Menghapus program studi berdasarkan ID (Hanya dapat diakses oleh Admin).',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
  response: {
    200: t.Object({
      message: t.String({ default: 'Program Studi berhasil dihapus' }),
    }),
    403: t.Object({
      error: t.String({ default: 'Akses ditolak. Hanya Admin.' }),
    }),
    404: t.Object({
      error: t.String({ default: 'Data tidak ditemukan' }),
    }),
  },
};

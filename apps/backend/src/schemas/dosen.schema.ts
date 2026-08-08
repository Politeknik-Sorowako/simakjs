import { t } from 'elysia';

export const dosenBody = t.Object({
  nip: t.String({ default: '198701012015011001' }),
  nama: t.String({ default: 'Dr. John Doe' }),
  email: t.String({ format: 'email', default: 'johndoe@test.com' }),
  programStudiId: t.Optional(t.Integer({ default: 1 })),
  idPddikti: t.Optional(t.Union([t.String(), t.Null()])),
  nidn: t.Optional(t.Union([t.String(), t.Null()], { default: '0001018701' })),
  nik: t.Optional(t.Union([t.String(), t.Null()], { default: '' })),
  jenisKelamin: t.Optional(t.Union([t.Literal('L'), t.Literal('P'), t.Null()], { default: 'L' })),
  tanggalLahir: t.Optional(t.Union([t.String(), t.Null()], { default: '' })),
});

export const updateDosenBody = t.Partial(
  t.Object({
    nip: t.String(),
    nama: t.String(),
    email: t.String({ format: 'email' }),
    programStudiId: t.Union([t.Integer(), t.Null()]),
    idPddikti: t.Union([t.String(), t.Null()]),
    nidn: t.Union([t.String(), t.Null()]),
    nik: t.Union([t.String(), t.Null()]),
    jenisKelamin: t.Union([t.Literal('L'), t.Literal('P'), t.Null()]),
    tanggalLahir: t.Union([t.String(), t.Null()]),
  }),
);

export const getDosenSchema = {
  detail: {
    tags: ['Dosen'],
    summary: 'Daftar Dosen',
    description:
      'Mengambil semua data dosen yang terdaftar dengan pagination, filter pencarian, dan relasi program studi.',
  },
  query: t.Object({
    page: t.Optional(t.Numeric({ default: 1 })),
    limit: t.Optional(t.Numeric({ default: 10 })),
    search: t.Optional(t.String({ default: '' })),
    programStudiId: t.Optional(t.Numeric()),
  }),
  response: {
    200: t.Object({
      data: t.Array(
        t.Object({
          id: t.Integer({ default: 1 }),
          nip: t.String({ default: '198701012015011001' }),
          nama: t.String({ default: 'Dr. John Doe' }),
          email: t.String({ default: 'johndoe@test.com' }),
          programStudiId: t.Union([t.Integer(), t.Null()], { default: 1 }),
          idPddikti: t.Union([t.String(), t.Null()], { default: null }),
          isSynced: t.Boolean({ default: false }),
          lastSyncAt: t.Union([t.String(), t.Null()], { default: null }),
          nidn: t.Union([t.String(), t.Null()], { default: '0001018701' }),
          nik: t.Union([t.String(), t.Null()], { default: '1234567890123456' }),
          jenisKelamin: t.Union([t.String(), t.Null()], { default: 'L' }),
          tanggalLahir: t.String(),
          createdAt: t.Union([t.String(), t.Null()], { default: null }),
          updatedAt: t.Union([t.String(), t.Null()], { default: null }),
          programStudi: t.Union([
            t.Object({
              id: t.Integer(),
              kode: t.String(),
              nama: t.String(),
              jenjang: t.String(),
            }),
            t.Null(),
          ]),
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

export const createDosenSchema = {
  detail: {
    tags: ['Dosen'],
    summary: 'Tambah Dosen Baru',
    description: 'Menambahkan dosen baru lengkap dengan NIDN, NIK, dan data lainnya (Hanya dapat diakses Admin).',
  },
  body: dosenBody,
  response: {
    201: t.Object({
      id: t.Integer({ default: 1 }),
      nip: t.String({ default: '198701012015011001' }),
      nama: t.String({ default: 'Dr. John Doe' }),
      email: t.String({ default: 'johndoe@test.com' }),
      programStudiId: t.Union([t.Integer(), t.Null()], { default: 1 }),
      idPddikti: t.Union([t.String(), t.Null()], { default: null }),
      isSynced: t.Boolean({ default: false }),
      lastSyncAt: t.Union([t.String(), t.Null()], { default: null }),
      nidn: t.Union([t.String(), t.Null()], { default: '0001018701' }),
      nik: t.Union([t.String(), t.Null()], { default: '1234567890123456' }),
      jenisKelamin: t.Union([t.String(), t.Null()], { default: 'L' }),
      tanggalLahir: t.String(),
      createdAt: t.Union([t.String(), t.Null()], { default: null }),
      updatedAt: t.Union([t.String(), t.Null()], { default: null }),
    }),
    403: t.Object({
      error: t.String({ default: 'Akses ditolak. Hanya Admin.' }),
    }),
  },
};

export const getDosenByIdSchema = {
  detail: {
    tags: ['Dosen'],
    summary: 'Detail Dosen',
    description: 'Mengambil satu data dosen berdasarkan ID beserta relasi program studi.',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
  response: {
    200: t.Object({
      id: t.Integer({ default: 1 }),
      nip: t.String({ default: '198701012015011001' }),
      nama: t.String({ default: 'Dr. John Doe' }),
      email: t.String({ default: 'johndoe@test.com' }),
      programStudiId: t.Union([t.Integer(), t.Null()], { default: 1 }),
      idPddikti: t.Union([t.String(), t.Null()], { default: null }),
      isSynced: t.Boolean({ default: false }),
      lastSyncAt: t.Union([t.String(), t.Null()], { default: null }),
      nidn: t.Union([t.String(), t.Null()], { default: '0001018701' }),
      nik: t.Union([t.String(), t.Null()], { default: '1234567890123456' }),
      jenisKelamin: t.Union([t.String(), t.Null()], { default: 'L' }),
      tanggalLahir: t.String(),
      createdAt: t.Union([t.String(), t.Null()], { default: null }),
      updatedAt: t.Union([t.String(), t.Null()], { default: null }),
      programStudi: t.Union([
        t.Object({
          id: t.Integer(),
          kode: t.String(),
          nama: t.String(),
          jenjang: t.String(),
        }),
        t.Null(),
      ]),
    }),
    404: t.Object({
      error: t.String({ default: 'Data tidak ditemukan' }),
    }),
  },
};

export const updateDosenSchema = {
  detail: {
    tags: ['Dosen'],
    summary: 'Perbarui Dosen',
    description: 'Memperbarui data dosen berdasarkan ID (Hanya dapat diakses oleh Admin).',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
  body: updateDosenBody,
  response: {
    200: t.Object({
      id: t.Integer({ default: 1 }),
      nip: t.String({ default: '198701012015011001' }),
      nama: t.String({ default: 'Dr. John Doe' }),
      email: t.String({ default: 'johndoe@test.com' }),
      programStudiId: t.Union([t.Integer(), t.Null()], { default: 1 }),
      idPddikti: t.Union([t.String(), t.Null()], { default: null }),
      isSynced: t.Boolean({ default: false }),
      lastSyncAt: t.Union([t.String(), t.Null()], { default: null }),
      nidn: t.Union([t.String(), t.Null()], { default: '0001018701' }),
      nik: t.Union([t.String(), t.Null()], { default: '1234567890123456' }),
      jenisKelamin: t.Union([t.String(), t.Null()], { default: 'L' }),
      tanggalLahir: t.String(),
      createdAt: t.Union([t.String(), t.Null()], { default: null }),
      updatedAt: t.Union([t.String(), t.Null()], { default: null }),
    }),
    403: t.Object({
      error: t.String({ default: 'Akses ditolak. Hanya Admin.' }),
    }),
    404: t.Object({
      error: t.String({ default: 'Data tidak ditemukan' }),
    }),
  },
};

export const importDosenSchema = {
  detail: {
    tags: ['Dosen'],
    summary: 'Impor Dosen dari CSV',
    description: 'Mengimpor data dosen secara massal dari file CSV.',
  },
};

export const deleteDosenSchema = {
  detail: {
    tags: ['Dosen'],
    summary: 'Hapus Dosen',
    description: 'Menghapus data dosen berdasarkan ID (Hanya dapat diakses oleh Admin).',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
  response: {
    200: t.Object({
      message: t.String({ default: 'Dosen berhasil dihapus' }),
    }),
    403: t.Object({
      error: t.String({ default: 'Akses ditolak. Hanya Admin.' }),
    }),
    404: t.Object({
      error: t.String({ default: 'Data tidak ditemukan' }),
    }),
  },
};

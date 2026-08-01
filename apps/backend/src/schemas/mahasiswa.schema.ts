import { t } from 'elysia';

export const mahasiswaBody = t.Object({
  nim: t.String({ default: '12345678' }),
  nama: t.String({ default: 'Budi Santoso' }),
  email: t.String({ format: 'email', default: 'budi@test.com' }),
  programStudiId: t.Integer({ default: 1 }),
  dosenPaId: t.Optional(t.Union([t.Integer(), t.Null()])),
  status: t.Optional(t.String({ default: 'aktif' })),
  idPddikti: t.Optional(t.String()),
  namaIbuKandung: t.Optional(t.Union([t.String(), t.Null()])),
  nik: t.Optional(t.Union([t.String(), t.Null()])),
  jenisKelamin: t.Union([t.Literal('L'), t.Literal('P')], { default: 'L' }),
  tanggalLahir: t.String({ default: '2000-01-01' }),
  tempatLahir: t.Optional(t.Union([t.String(), t.Null()])),
  idAgama: t.Optional(t.Union([t.Integer(), t.Null()])),
  jalan: t.Optional(t.Union([t.String(), t.Null()])),
  rt: t.Optional(t.Union([t.String(), t.Null()])),
  rw: t.Optional(t.Union([t.String(), t.Null()])),
  kodePos: t.Optional(t.Union([t.String(), t.Null()])),
  kewarganegaraan: t.Optional(t.Union([t.String(), t.Null()])),
});

export const updateMahasiswaBody = t.Object({
  nim: t.Optional(t.String()),
  nama: t.Optional(t.String()),
  email: t.Optional(t.String({ format: 'email' })),
  programStudiId: t.Optional(t.Integer()),
  dosenPaId: t.Optional(t.Union([t.Integer(), t.Null()])),
  status: t.Optional(t.String()),
  idPddikti: t.Optional(t.String()),
  namaIbuKandung: t.Optional(t.Union([t.String(), t.Null()])),
  nik: t.Optional(t.Union([t.String(), t.Null()])),
  jenisKelamin: t.Optional(t.Union([t.Literal('L'), t.Literal('P')])),
  tanggalLahir: t.Optional(t.String()),
  tempatLahir: t.Optional(t.Union([t.String(), t.Null()])),
  idAgama: t.Optional(t.Union([t.Integer(), t.Null()])),
  jalan: t.Optional(t.Union([t.String(), t.Null()])),
  rt: t.Optional(t.Union([t.String(), t.Null()])),
  rw: t.Optional(t.Union([t.String(), t.Null()])),
  kodePos: t.Optional(t.Union([t.String(), t.Null()])),
  kewarganegaraan: t.Optional(t.Union([t.String(), t.Null()])),
});

export const getMahasiswaSchema = {
  detail: {
    tags: ['Mahasiswa'],
    summary: 'Daftar Mahasiswa',
    description:
      'Mengambil semua data mahasiswa dengan pagination, filter pencarian, dan relasi program studi. Field alamat (jalan, rt, rw, kodePos), kewarganegaraan, tempat lahir, dan agama tidak dikembalikan di list endpoint.',
  },
  query: t.Object({
    page: t.Optional(t.Numeric({ default: 1 })),
    limit: t.Optional(t.Numeric({ default: 10 })),
    search: t.Optional(t.String({ default: '' })),
    programStudiId: t.Optional(t.Numeric()),
    sortBy: t.Optional(t.String()),
    sortOrder: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
    filterNim: t.Optional(t.String()),
    filterNama: t.Optional(t.String()),
    filterEmail: t.Optional(t.String()),
    filterStatus: t.Optional(t.String()),
  }),
  response: {
    200: t.Object({
      data: t.Array(
        t.Object({
          id: t.Integer({ default: 1 }),
          nim: t.String({ default: '12345678' }),
          nama: t.String({ default: 'Budi Santoso' }),
          email: t.String({ default: 'budi@test.com' }),
          programStudiId: t.Union([t.Integer(), t.Null()], { default: 1 }),
          dosenPaId: t.Union([t.Integer(), t.Null()], { default: null }),
          status: t.String({ default: 'aktif' }),
          namaIbuKandung: t.Union([t.String(), t.Null()], { default: null }),
          nik: t.Union([t.String(), t.Null()], { default: null }),
          jenisKelamin: t.String({ default: 'L' }),
          tanggalLahir: t.Any(),
          tempatLahir: t.Union([t.String(), t.Null()], { default: null }),
          idAgama: t.Union([t.Integer(), t.Null()], { default: null }),
          jalan: t.Union([t.String(), t.Null()], { default: null }),
          rt: t.Union([t.String(), t.Null()], { default: null }),
          rw: t.Union([t.String(), t.Null()], { default: null }),
          kodePos: t.Union([t.String(), t.Null()], { default: null }),
          kewarganegaraan: t.Union([t.String(), t.Null()], { default: null }),
          idPddikti: t.Union([t.String(), t.Null()], { default: null }),
          isSynced: t.Boolean({ default: false }),
          lastSyncAt: t.Union([t.String(), t.Null()], { default: null }),
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
          dosenPa: t.Optional(
            t.Union([
              t.Object({
                id: t.Integer(),
                nip: t.String(),
                nama: t.String(),
                email: t.String(),
              }),
              t.Null(),
            ]),
          ),
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

export const createMahasiswaSchema = {
  detail: {
    tags: ['Mahasiswa'],
    summary: 'Tambah Mahasiswa Baru',
    description:
      'Menambahkan mahasiswa baru lengkap dengan data wajib PDDIKTI (Hanya dapat diakses Admin / Dosen dengan token JWT).',
  },
  body: mahasiswaBody,
  response: {
    201: t.Object({
      id: t.Integer({ default: 1 }),
      nim: t.String({ default: '12345678' }),
      nama: t.String({ default: 'Budi Santoso' }),
      email: t.String({ default: 'budi@test.com' }),
      programStudiId: t.Union([t.Integer(), t.Null()], { default: 1 }),
      dosenPaId: t.Union([t.Integer(), t.Null()], { default: null }),
      status: t.String({ default: 'aktif' }),
      namaIbuKandung: t.String({ default: 'Ibu Budi' }),
      nik: t.String({ default: '1234567890123456' }),
      jenisKelamin: t.String({ default: 'L' }),
      tanggalLahir: t.Any(),
      idPddikti: t.Union([t.String(), t.Null()], { default: null }),
      isSynced: t.Boolean({ default: false }),
      lastSyncAt: t.Union([t.String(), t.Null()], { default: null }),
      createdAt: t.Any(),
      updatedAt: t.Any(),
    }),
    403: t.Object({
      error: t.String({ default: 'Akses ditolak.' }),
    }),
    422: t.Object({
      message: t.String({ default: 'Validation error message...' }),
    }),
  },
};

export const getMahasiswaByIdSchema = {
  detail: {
    tags: ['Mahasiswa'],
    summary: 'Detail Mahasiswa',
    description: 'Mengambil satu data mahasiswa berdasarkan ID beserta relasi program studi.',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
  response: {
    200: t.Object({
      id: t.Integer({ default: 1 }),
      nim: t.String({ default: '12345678' }),
      nama: t.String({ default: 'Budi Santoso' }),
      email: t.String({ default: 'budi@test.com' }),
      programStudiId: t.Union([t.Integer(), t.Null()], { default: 1 }),
      dosenPaId: t.Union([t.Integer(), t.Null()], { default: null }),
      status: t.String({ default: 'aktif' }),
      namaIbuKandung: t.String({ default: 'Ibu Budi' }),
      nik: t.String({ default: '1234567890123456' }),
      jenisKelamin: t.String({ default: 'L' }),
      tanggalLahir: t.Any(),
      idPddikti: t.Union([t.String(), t.Null()], { default: null }),
      isSynced: t.Boolean({ default: false }),
      lastSyncAt: t.Union([t.String(), t.Null()], { default: null }),
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
      dosenPa: t.Optional(
        t.Union([
          t.Object({
            id: t.Integer(),
            nip: t.String(),
            nama: t.String(),
            email: t.String(),
          }),
          t.Null(),
        ]),
      ),
    }),
    404: t.Object({
      error: t.String({ default: 'Data tidak ditemukan' }),
    }),
  },
};

export const updateMahasiswaSchema = {
  detail: {
    tags: ['Mahasiswa'],
    summary: 'Perbarui Mahasiswa',
    description: 'Memperbarui data mahasiswa berdasarkan ID (Hanya dapat diakses oleh Admin/Dosen).',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
  body: updateMahasiswaBody,
  response: {
    200: t.Object({
      id: t.Integer({ default: 1 }),
      nim: t.String({ default: '12345678' }),
      nama: t.String({ default: 'Budi Santoso' }),
      email: t.String({ default: 'budi@test.com' }),
      programStudiId: t.Union([t.Integer(), t.Null()], { default: 1 }),
      dosenPaId: t.Union([t.Integer(), t.Null()], { default: null }),
      status: t.String({ default: 'aktif' }),
      namaIbuKandung: t.String({ default: 'Ibu Budi' }),
      nik: t.String({ default: '1234567890123456' }),
      jenisKelamin: t.String({ default: 'L' }),
      tanggalLahir: t.Any(),
      idPddikti: t.Union([t.String(), t.Null()], { default: null }),
      isSynced: t.Boolean({ default: false }),
      lastSyncAt: t.Union([t.String(), t.Null()], { default: null }),
      createdAt: t.Any(),
      updatedAt: t.Any(),
    }),
    403: t.Object({
      error: t.String({ default: 'Akses ditolak.' }),
    }),
    404: t.Object({
      error: t.String({ default: 'Data tidak ditemukan' }),
    }),
  },
};

export const getMahasiswaStatsSchema = {
  detail: {
    tags: ['Mahasiswa'],
    summary: 'Statistik Mahasiswa',
    description: 'Mengambil statistik jumlah mahasiswa per prodi, per status, per angkatan.',
  },
};

export const getMahasiswaBaruSchema = {
  detail: {
    tags: ['Mahasiswa'],
    summary: 'Daftar Mahasiswa Baru',
    description: 'Mengambil daftar mahasiswa baru untuk periode akademik tertentu.',
  },
};

export const importMahasiswaSchema = {
  detail: {
    tags: ['Mahasiswa'],
    summary: 'Impor Mahasiswa dari CSV',
    description: 'Mengimpor data mahasiswa secara massal dari file CSV.',
  },
};

export const importPaMahasiswaSchema = {
  detail: {
    tags: ['Mahasiswa'],
    summary: 'Impor Dosen PA dari CSV',
    description: 'Mengimpor mapping dosen pembimbing akademik (PA) untuk mahasiswa dari file CSV.',
  },
};

export const deleteMahasiswaSchema = {
  detail: {
    tags: ['Mahasiswa'],
    summary: 'Hapus Mahasiswa',
    description: 'Menghapus data mahasiswa berdasarkan ID (Hanya dapat diakses oleh Admin/Dosen).',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
  response: {
    200: t.Object({
      message: t.String({ default: 'Mahasiswa berhasil dihapus' }),
    }),
    403: t.Object({
      error: t.String({ default: 'Akses ditolak.' }),
    }),
    404: t.Object({
      error: t.String({ default: 'Data tidak ditemukan' }),
    }),
  },
};

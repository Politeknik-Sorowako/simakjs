import { t } from 'elysia';

export const krsBody = t.Object({
  mahasiswaId: t.Integer({ default: 1 }),
  kelasKuliahId: t.Integer({ default: 1 }),
  nilaiAngka: t.Optional(t.Numeric()),
  nilaiHuruf: t.Optional(t.String()),
  nilaiIndeks: t.Optional(t.Numeric()),
  idPddikti: t.Optional(t.String()),
});

export const updateKrsBody = t.Partial(
  t.Object({
    mahasiswaId: t.Integer(),
    kelasKuliahId: t.Integer(),
    nilaiAngka: t.Numeric(),
    nilaiHuruf: t.String(),
    nilaiIndeks: t.Numeric(),
    idPddikti: t.String(),
  }),
);

export const getKrsSchema = {
  detail: {
    tags: ['KRS'],
    summary: 'Daftar KRS',
    description:
      'Mengambil semua data KRS dengan pagination, filter pencarian (nama/nim mahasiswa), dan relasi mahasiswa & kelas kuliah.',
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
          mahasiswaId: t.Integer({ default: 1 }),
          kelasKuliahId: t.Integer({ default: 1 }),
          nilaiAngka: t.Union([t.String(), t.Null()], { default: null }),
          nilaiHuruf: t.Union([t.String(), t.Null()], { default: null }),
          nilaiIndeks: t.Union([t.String(), t.Null()], { default: null }),
          isApproved: t.Boolean({ default: false }),
          idPddikti: t.Union([t.String(), t.Null()], { default: null }),
          isSynced: t.Boolean({ default: false }),
          lastSyncAt: t.Union([t.String(), t.Null()], { default: null }),
          createdAt: t.Any(),
          updatedAt: t.Any(),
          mahasiswa: t.Union([
            t.Object({
              id: t.Integer(),
              nim: t.String(),
              nama: t.String(),
              email: t.String(),
            }),
            t.Null(),
          ]),
          kelasKuliah: t.Union([
            t.Object({
              id: t.Integer(),
              namaKelas: t.String(),
              periodeId: t.String(),
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

export const createKrsSchema = {
  detail: {
    tags: ['KRS'],
    summary: 'Tambah KRS Baru',
    description: 'Menambahkan KRS baru (Hanya dapat diakses Admin/Dosen/Mahasiswa dengan verifikasi token JWT).',
  },
  body: krsBody,
  response: {
    201: t.Object({
      id: t.Integer({ default: 1 }),
      mahasiswaId: t.Integer({ default: 1 }),
      kelasKuliahId: t.Integer({ default: 1 }),
      nilaiAngka: t.Union([t.String(), t.Null()], { default: null }),
      nilaiHuruf: t.Union([t.String(), t.Null()], { default: null }),
      nilaiIndeks: t.Union([t.String(), t.Null()], { default: null }),
      idPddikti: t.Union([t.String(), t.Null()], { default: null }),
      isSynced: t.Boolean({ default: false }),
      lastSyncAt: t.Union([t.String(), t.Null()], { default: null }),
      createdAt: t.Any(),
      updatedAt: t.Any(),
    }),
    403: t.Object({
      error: t.String({ default: 'Akses ditolak.' }),
    }),
  },
};

export const getKrsByIdSchema = {
  detail: {
    tags: ['KRS'],
    summary: 'Detail KRS',
    description: 'Mengambil satu data KRS berdasarkan ID beserta relasi mahasiswa & kelas kuliah.',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
  response: {
    200: t.Object({
      id: t.Integer({ default: 1 }),
      mahasiswaId: t.Integer({ default: 1 }),
      kelasKuliahId: t.Integer({ default: 1 }),
      nilaiAngka: t.Union([t.String(), t.Null()], { default: null }),
      nilaiHuruf: t.Union([t.String(), t.Null()], { default: null }),
      nilaiIndeks: t.Union([t.String(), t.Null()], { default: null }),
      isApproved: t.Boolean({ default: false }),
      idPddikti: t.Union([t.String(), t.Null()], { default: null }),
      isSynced: t.Boolean({ default: false }),
      lastSyncAt: t.Union([t.String(), t.Null()], { default: null }),
      createdAt: t.Any(),
      updatedAt: t.Any(),
      mahasiswa: t.Union([
        t.Object({
          id: t.Integer(),
          nim: t.String(),
          nama: t.String(),
          email: t.String(),
        }),
        t.Null(),
      ]),
      kelasKuliah: t.Union([
        t.Object({
          id: t.Integer(),
          namaKelas: t.String(),
          periodeId: t.String(),
        }),
        t.Null(),
      ]),
    }),
    404: t.Object({
      error: t.String({ default: 'Data tidak ditemukan' }),
    }),
  },
};

export const updateKrsSchema = {
  detail: {
    tags: ['KRS'],
    summary: 'Perbarui KRS',
    description:
      'Memperbarui data KRS berdasarkan ID (Dapat diakses oleh Admin/Dosen untuk mengubah nilai, atau Mahasiswa jika KRS belum dikunci).',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
  body: updateKrsBody,
  response: {
    200: t.Object({
      id: t.Integer({ default: 1 }),
      mahasiswaId: t.Integer({ default: 1 }),
      kelasKuliahId: t.Integer({ default: 1 }),
      nilaiAngka: t.Union([t.String(), t.Null()], { default: null }),
      nilaiHuruf: t.Union([t.String(), t.Null()], { default: null }),
      nilaiIndeks: t.Union([t.String(), t.Null()], { default: null }),
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

export const deleteKrsSchema = {
  detail: {
    tags: ['KRS'],
    summary: 'Hapus KRS',
    description: 'Menghapus data KRS berdasarkan ID.',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
  response: {
    200: t.Object({
      message: t.String({ default: 'KRS berhasil dihapus' }),
    }),
    403: t.Object({
      error: t.String({ default: 'Akses ditolak.' }),
    }),
    404: t.Object({
      error: t.String({ default: 'Data tidak ditemukan' }),
    }),
  },
};

export const approveKrsBody = t.Object({
  mahasiswaId: t.Optional(t.Union([t.Integer(), t.Null()])),
  periodeId: t.String({ default: '20231' }),
});

export const approveKrsSchema = {
  detail: {
    tags: ['KRS'],
    summary: 'Persetujuan KRS oleh Dosen PA',
    description: 'Menyetujui semua item KRS mahasiswa di periode akademik tertentu (Hanya dapat diakses Admin/Dosen).',
  },
  body: approveKrsBody,
  response: {
    200: t.Object({
      message: t.String({ default: 'KRS berhasil disetujui' }),
      count: t.Integer({ default: 1 }),
    }),
    400: t.Object({
      error: t.String(),
    }),
    403: t.Object({
      error: t.String({ default: 'Akses ditolak.' }),
    }),
  },
};

export const getPendingStudentsSchema = {
  detail: {
    tags: ['KRS'],
    summary: 'Daftar Mahasiswa Pending KRS',
    description: 'Mengambil mahasiswa yang memiliki kontrak KRS pending/belum disetujui di periode tertentu.',
  },
  query: t.Object({
    periodeId: t.String({ default: '20231' }),
  }),
  response: {
    200: t.Array(
      t.Object({
        id: t.Integer({ default: 1 }),
        nim: t.String({ default: '202301001' }),
        nama: t.String({ default: 'Andi Pratama' }),
        email: t.String({ default: 'andi@gmail.com' }),
        status: t.String({ default: 'aktif' }),
      }),
    ),
  },
};

export const approveBatchKrsSchema = {
  detail: {
    tags: ['KRS'],
    summary: 'Persetujuan KRS Massal',
    description: 'Menyetujui KRS beberapa mahasiswa sekaligus di periode tertentu.',
  },
  body: t.Object({
    mahasiswaIds: t.Array(t.Integer(), { default: [1] }),
    periodeId: t.String({ default: '20231' }),
  }),
  response: {
    200: t.Object({
      message: t.String({ default: 'KRS mahasiswa terpilih berhasil disetujui' }),
      count: t.Integer({ default: 1 }),
    }),
  },
};

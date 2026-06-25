import { t } from 'elysia';

export const getKelasSchema = {
  detail: {
    tags: ['Kelas Kuliah'],
    summary: 'Daftar Kelas Kuliah',
    description: 'Mengambil semua data kelas kuliah dengan pagination, filter pencarian, dan relasi mata kuliah & periode akademik.'
  },
  query: t.Object({
    page: t.Optional(t.String({ default: '1' })),
    limit: t.Optional(t.String({ default: '10' })),
    search: t.Optional(t.String({ default: '' }))
  }),
  response: {
    200: t.Object({
      data: t.Array(
        t.Object({
          id: t.Integer({ default: 1 }),
          mataKuliahId: t.Integer({ default: 1 }),
          periodeId: t.String({ default: '20231' }),
          namaKelas: t.String({ default: '4A' }),
          idPddikti: t.Union([t.String(), t.Null()], { default: null }),
          isSynced: t.Boolean({ default: false }),
          lastSyncAt: t.Union([t.String(), t.Null()], { default: null }),
          createdAt: t.Any(),
          updatedAt: t.Any(),
          mataKuliah: t.Union([
            t.Object({
              id: t.Integer(),
              kode: t.String(),
              nama: t.String(),
              sksTotal: t.Integer()
            }),
            t.Null()
          ]),
          periodeAkademik: t.Union([
            t.Object({
              id: t.String(),
              nama: t.String(),
              aktif: t.Boolean()
            }),
            t.Null()
          ])
        })
      ),
      meta: t.Object({
        total: t.Integer({ default: 1 }),
        page: t.Integer({ default: 1 }),
        limit: t.Integer({ default: 10 }),
        totalPages: t.Integer({ default: 1 })
      })
    })
  }
};

export const createKelasSchema = {
  detail: {
    tags: ['Kelas Kuliah'],
    summary: 'Tambah Kelas Kuliah Baru',
    description: 'Menambahkan kelas kuliah baru (Hanya dapat diakses Admin).'
  },
  body: t.Object({
    mataKuliahId: t.Integer({ default: 1 }),
    periodeId: t.String({ default: '20231' }),
    namaKelas: t.String({ default: '4A' }),
    idPddikti: t.Optional(t.String())
  }),
  response: {
    201: t.Object({
      id: t.Integer({ default: 1 }),
      mataKuliahId: t.Integer({ default: 1 }),
      periodeId: t.String({ default: '20231' }),
      namaKelas: t.String({ default: '4A' }),
      idPddikti: t.Union([t.String(), t.Null()], { default: null }),
      isSynced: t.Boolean({ default: false }),
      lastSyncAt: t.Union([t.String(), t.Null()], { default: null }),
      createdAt: t.Any(),
      updatedAt: t.Any()
    }),
    403: t.Object({
      error: t.String({ default: 'Akses ditolak. Hanya Admin.' })
    })
  }
};

export const getKelasByIdSchema = {
  detail: {
    tags: ['Kelas Kuliah'],
    summary: 'Detail Kelas Kuliah',
    description: 'Mengambil satu data kelas kuliah berdasarkan ID beserta relasi mata kuliah & periode akademik.'
  },
  params: t.Object({
    id: t.Numeric()
  }),
  response: {
    200: t.Object({
      id: t.Integer({ default: 1 }),
      mataKuliahId: t.Integer({ default: 1 }),
      periodeId: t.String({ default: '20231' }),
      namaKelas: t.String({ default: '4A' }),
      idPddikti: t.Union([t.String(), t.Null()], { default: null }),
      isSynced: t.Boolean({ default: false }),
      lastSyncAt: t.Union([t.String(), t.Null()], { default: null }),
      createdAt: t.Any(),
      updatedAt: t.Any(),
      mataKuliah: t.Union([
        t.Object({
          id: t.Integer(),
          kode: t.String(),
          nama: t.String(),
          sksTotal: t.Integer()
        }),
        t.Null()
      ]),
      periodeAkademik: t.Union([
        t.Object({
          id: t.String(),
          nama: t.String(),
          aktif: t.Boolean()
        }),
        t.Null()
      ])
    }),
    404: t.Object({
      error: t.String({ default: 'Data tidak ditemukan' })
    })
  }
};

export const updateKelasSchema = {
  detail: {
    tags: ['Kelas Kuliah'],
    summary: 'Perbarui Kelas Kuliah',
    description: 'Memperbarui data kelas kuliah berdasarkan ID (Hanya dapat diakses oleh Admin).'
  },
  params: t.Object({
    id: t.Numeric()
  }),
  body: t.Object({
    mataKuliahId: t.Optional(t.Integer()),
    periodeId: t.Optional(t.String()),
    namaKelas: t.Optional(t.String()),
    idPddikti: t.Optional(t.String())
  }),
  response: {
    200: t.Object({
      id: t.Integer({ default: 1 }),
      mataKuliahId: t.Integer({ default: 1 }),
      periodeId: t.String({ default: '20231' }),
      namaKelas: t.String({ default: '4A' }),
      idPddikti: t.Union([t.String(), t.Null()], { default: null }),
      isSynced: t.Boolean({ default: false }),
      lastSyncAt: t.Union([t.String(), t.Null()], { default: null }),
      createdAt: t.Any(),
      updatedAt: t.Any()
    }),
    403: t.Object({
      error: t.String({ default: 'Akses ditolak. Hanya Admin.' })
    }),
    404: t.Object({
      error: t.String({ default: 'Data tidak ditemukan' })
    })
  }
};

export const deleteKelasSchema = {
  detail: {
    tags: ['Kelas Kuliah'],
    summary: 'Hapus Kelas Kuliah',
    description: 'Menghapus data kelas kuliah berdasarkan ID (Hanya dapat diakses oleh Admin).'
  },
  params: t.Object({
    id: t.Numeric()
  }),
  response: {
    200: t.Object({
      message: t.String({ default: 'Kelas Kuliah berhasil dihapus' })
    }),
    403: t.Object({
      error: t.String({ default: 'Akses ditolak. Hanya Admin.' })
    }),
    404: t.Object({
      error: t.String({ default: 'Data tidak ditemukan' })
    })
  }
};

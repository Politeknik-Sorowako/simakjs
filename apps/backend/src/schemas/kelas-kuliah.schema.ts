import { t } from 'elysia';

export const kelasBody = t.Object({
  mataKuliahId: t.Integer({ default: 1 }),
  periodeId: t.String({ default: '20231' }),
  namaKelas: t.String({ default: '4A' }),
  idPddikti: t.Optional(t.String()),
});

export const updateKelasBody = t.Partial(
  t.Object({
    mataKuliahId: t.Integer(),
    periodeId: t.String(),
    namaKelas: t.String(),
    idPddikti: t.String(),
  }),
);

export const getKelasSchema = {
  detail: {
    tags: ['Kelas Kuliah'],
    summary: 'Daftar Kelas Kuliah',
    description:
      'Mengambil semua data kelas kuliah dengan pagination, filter pencarian, dan relasi mata kuliah & periode akademik.',
  },
  query: t.Object({
    page: t.Optional(t.Numeric({ default: 1 })),
    limit: t.Optional(t.Numeric({ default: 10 })),
    search: t.Optional(t.String({ default: '' })),
    programStudiId: t.Optional(t.Numeric()),
    periodeId: t.Optional(t.String()),
  }),
  response: {
    200: t.Object({
      data: t.Array(
        t.Object({
          id: t.Integer({ default: 1 }),
          mataKuliahId: t.Integer({ default: 1 }),
          periodeId: t.String({ default: '20231' }),
          namaKelas: t.String({ default: '4A' }),
          isLocked: t.Boolean({ default: false }),
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
              sksTotal: t.Integer(),
            }),
            t.Null(),
          ]),
          periodeAkademik: t.Union([
            t.Object({
              id: t.String(),
              nama: t.String(),
              aktif: t.Boolean(),
            }),
            t.Null(),
          ]),
          dosenPengajarKelas: t.Optional(
            t.Array(
              t.Object({
                id: t.Integer(),
                dosenId: t.Integer(),
                kelasKuliahId: t.Integer(),
                sksBebanMengajar: t.Union([t.Integer(), t.Null()]),
                dosen: t.Union([
                  t.Object({
                    id: t.Integer(),
                    nip: t.String(),
                    nama: t.String(),
                    email: t.String(),
                  }),
                  t.Null(),
                ]),
              }),
            ),
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

export const createKelasSchema = {
  detail: {
    tags: ['Kelas Kuliah'],
    summary: 'Tambah Kelas Kuliah Baru',
    description: 'Menambahkan kelas kuliah baru (Hanya dapat diakses Admin).',
  },
  body: kelasBody,
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
      updatedAt: t.Any(),
    }),
    403: t.Object({
      error: t.String({ default: 'Akses ditolak. Hanya Admin.' }),
    }),
  },
};

export const getKelasByIdSchema = {
  detail: {
    tags: ['Kelas Kuliah'],
    summary: 'Detail Kelas Kuliah',
    description: 'Mengambil satu data kelas kuliah berdasarkan ID beserta relasi mata kuliah & periode akademik.',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
  response: {
    200: t.Object({
      id: t.Integer({ default: 1 }),
      mataKuliahId: t.Integer({ default: 1 }),
      periodeId: t.String({ default: '20231' }),
      namaKelas: t.String({ default: '4A' }),
      isLocked: t.Boolean({ default: false }),
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
          sksTotal: t.Integer(),
        }),
        t.Null(),
      ]),
      periodeAkademik: t.Union([
        t.Object({
          id: t.String(),
          nama: t.String(),
          aktif: t.Boolean(),
        }),
        t.Null(),
      ]),
      dosenPengajarKelas: t.Optional(
        t.Array(
          t.Object({
            id: t.Integer(),
            dosenId: t.Integer(),
            kelasKuliahId: t.Integer(),
            sksBebanMengajar: t.Union([t.Integer(), t.Null()]),
            dosen: t.Union([
              t.Object({
                id: t.Integer(),
                nip: t.String(),
                nama: t.String(),
                email: t.String(),
              }),
              t.Null(),
            ]),
          }),
        ),
      ),
    }),
    404: t.Object({
      error: t.String({ default: 'Data tidak ditemukan' }),
    }),
  },
};

export const updateKelasSchema = {
  detail: {
    tags: ['Kelas Kuliah'],
    summary: 'Perbarui Kelas Kuliah',
    description: 'Memperbarui data kelas kuliah berdasarkan ID (Hanya dapat diakses oleh Admin).',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
  body: updateKelasBody,
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
    }),
    403: t.Object({
      error: t.String({ default: 'Akses ditolak. Hanya Admin.' }),
    }),
    404: t.Object({
      error: t.String({ default: 'Data tidak ditemukan' }),
    }),
  },
};

export const getKelasByMkSchema = {
  detail: {
    tags: ['Kelas Kuliah'],
    summary: 'Daftar Kelas per Mata Kuliah',
    description: 'Mengambil daftar kelas kuliah berdasarkan mata kuliah dan periode akademik.',
  },
  query: t.Object({
    mataKuliahId: t.Numeric(),
    periodeId: t.String(),
  }),
};

export const deleteKelasSchema = {
  detail: {
    tags: ['Kelas Kuliah'],
    summary: 'Hapus Kelas Kuliah',
    description: 'Menghapus data kelas kuliah berdasarkan ID (Hanya dapat diakses oleh Admin).',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
  response: {
    200: t.Object({
      message: t.String({ default: 'Kelas Kuliah berhasil dihapus' }),
    }),
    403: t.Object({
      error: t.String({ default: 'Akses ditolak. Hanya Admin.' }),
    }),
    404: t.Object({
      error: t.String({ default: 'Data tidak ditemukan' }),
    }),
  },
};

export const importKelasBody = t.Object({
  items: t.Array(
    t.Object({
      kodeMataKuliah: t.Optional(t.String()),
      periodeId: t.String(),
      namaKelas: t.String(),
      idPddikti: t.Optional(t.String()),
    }),
  ),
});

export const importKelasSchema = {
  detail: {
    tags: ['Kelas Kuliah'],
    summary: 'Import Kelas Kuliah',
    description: 'Import Kelas Kuliah dari CSV.',
  },
  body: importKelasBody,
  response: {
    200: t.Object({
      success: t.Integer(),
      failed: t.Integer(),
      errors: t.Array(
        t.Object({
          row: t.Integer(),
          namaKelas: t.String(),
          error: t.String(),
        }),
      ),
    }),
    400: t.Object({ error: t.String() }),
  },
};

export const getTemplateKelasSchema = {
  detail: {
    tags: ['Kelas Kuliah'],
    summary: 'Download Template CSV Kelas Kuliah',
    description: 'Download template CSV untuk import Kelas Kuliah.',
  },
};

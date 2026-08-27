import { t } from 'elysia';

export const JENIS_KOMPEN_LIST = ['sakit', 'izin', 'alpa', 'terlambat', 'rusak'] as const;

export const jenisKompenEnum = t.Union([
  t.Literal('sakit'),
  t.Literal('izin'),
  t.Literal('alpa'),
  t.Literal('terlambat'),
  t.Literal('rusak'),
]);

export const createKompensasiManualBody = t.Object({
  mahasiswaId: t.Integer(),
  tanggal: t.String({ description: 'Format YYYY-MM-DD' }),
  jenisKompen: jenisKompenEnum,
  durasiMenit: t.Optional(t.Integer({ minimum: 1 })),
  keterangan: t.Optional(t.Nullable(t.String())),
});

export const updateKompensasiManualBody = t.Partial(createKompensasiManualBody);

export const createKompensasiManualSchema = {
  detail: {
    tags: ['Kompensasi Manual'],
    summary: 'Input Kompensasi Mahasiswa Manual',
    description:
      'Mencatat kompensasi manual. Sakit/Izin/Alpa otomatis dihitung 480 menit. ' +
      'Terlambat/Rusak wajib mengisi durasiMenit. Total per mahasiswa per hari dibatasi 480 menit.',
  },
  body: createKompensasiManualBody,
  response: {
    200: t.Object({
      id: t.Integer(),
      mahasiswaId: t.Integer(),
      tanggal: t.String(),
      jenisKompen: t.String(),
      durasiMenit: t.Integer(),
      keterangan: t.Union([t.String(), t.Null()]),
      createdBy: t.Union([t.Integer(), t.Null()]),
      createdAt: t.Union([t.Date(), t.Null()], { default: null }),
      updatedAt: t.Union([t.Date(), t.Null()], { default: null }),
      isDuplicateRisk: t.Boolean(),
    }),
    400: t.Object({ error: t.String() }),
    403: t.Object({ error: t.String() }),
    404: t.Object({ error: t.String() }),
  },
};

export const updateKompensasiManualSchema = {
  detail: {
    tags: ['Kompensasi Manual'],
    summary: 'Update Kompensasi Manual',
    description: 'Memperbarui catatan kompensasi manual beserta validasi batas 480 menit/hari.',
  },
  params: t.Object({ id: t.Numeric() }),
  body: updateKompensasiManualBody,
  response: {
    200: t.Object({
      id: t.Integer(),
      mahasiswaId: t.Integer(),
      tanggal: t.String(),
      jenisKompen: t.String(),
      durasiMenit: t.Integer(),
      keterangan: t.Union([t.String(), t.Null()]),
      createdBy: t.Union([t.Integer(), t.Null()]),
      createdAt: t.Union([t.Date(), t.Null()], { default: null }),
      updatedAt: t.Union([t.Date(), t.Null()], { default: null }),
    }),
    400: t.Object({ error: t.String() }),
    403: t.Object({ error: t.String() }),
    404: t.Object({ error: t.String() }),
  },
};

export const deleteKompensasiManualSchema = {
  detail: {
    tags: ['Kompensasi Manual'],
    summary: 'Hapus Kompensasi Manual',
    description: 'Menghapus catatan kompensasi manual berdasarkan ID.',
  },
  params: t.Object({ id: t.Numeric() }),
  response: {
    200: t.Object({ success: t.Boolean() }),
    400: t.Object({ error: t.String() }),
    403: t.Object({ error: t.String() }),
    404: t.Object({ error: t.String() }),
  },
};

export const bulkDeleteKompensasiManualSchema = {
  detail: {
    tags: ['Kompensasi Manual'],
    summary: 'Hapus Massal Kompensasi Manual',
    description: 'Menghapus beberapa catatan kompensasi manual sekaligus beserta sinkronisasi tabel ketidakhadiran.',
  },
  body: t.Object({ ids: t.Array(t.Integer()) }),
  response: {
    200: t.Object({
      success: t.Boolean(),
      deleted: t.Integer(),
    }),
    400: t.Object({ error: t.String() }),
    403: t.Object({ error: t.String() }),
  },
};

export const bulkUpdateKompensasiManualSchema = {
  detail: {
    tags: ['Kompensasi Manual'],
    summary: 'Ubah Massal Kompensasi Manual',
    description:
      'Memperbarui jenis kompensasi dan/atau durasi menit pada beberapa catatan sekaligus dengan validasi batas harian.',
  },
  body: t.Object({
    ids: t.Array(t.Integer()),
    jenisKompen: t.Optional(jenisKompenEnum),
    durasiMenit: t.Optional(t.Integer({ minimum: 1 })),
  }),
  response: {
    200: t.Object({
      success: t.Boolean(),
      updated: t.Integer(),
    }),
    400: t.Object({ error: t.String() }),
    403: t.Object({ error: t.String() }),
  },
};

export const getRiwayatKompensasiManualSchema = {
  detail: {
    tags: ['Kompensasi Manual'],
    summary: 'Riwayat Kompensasi Manual Mahasiswa',
    description: 'Mengambil riwayat kompensasi manual per mahasiswa.',
  },
  params: t.Object({ mahasiswaId: t.Numeric() }),
  response: {
    200: t.Array(
      t.Object({
        id: t.Integer(),
        tanggal: t.String(),
        jenisKompen: t.String(),
        durasiMenit: t.Integer(),
        keterangan: t.Union([t.String(), t.Null()]),
        createdBy: t.Union([t.Integer(), t.Null()]),
        createdAt: t.Union([t.Date(), t.Null()], { default: null }),
      }),
    ),
    400: t.Object({ error: t.String() }),
  },
};

export const getDuplicateRiskSchema = {
  detail: {
    tags: ['Kompensasi Manual'],
    summary: 'Riwayat Kompensasi Berpeluang Ganda',
    description: 'Mengambil daftar mahasiswa yang memiliki lebih dari satu data kompensasi dalam satu hari.',
  },
  query: t.Object({
    mahasiswaId: t.Optional(t.String()),
    tanggal: t.Optional(t.String()),
  }),
  response: {
    200: t.Array(
      t.Object({
        mahasiswaId: t.Integer(),
        nim: t.String(),
        nama: t.String(),
        tanggal: t.String(),
        count: t.Integer(),
        totalMenit: t.Integer(),
        records: t.Array(
          t.Object({
            id: t.Integer(),
            jenisKompen: t.String(),
            durasiMenit: t.Integer(),
            keterangan: t.Union([t.String(), t.Null()]),
            createdAt: t.Union([t.Date(), t.Null()], { default: null }),
          }),
        ),
      }),
    ),
    400: t.Object({ error: t.String() }),
  },
};

export const getKompensasiManualStatsSchema = {
  detail: {
    tags: ['Kompensasi Manual'],
    summary: 'Statistik Kompensasi Manual',
    description: 'Statistik agregat kompensasi manual beserta jumlah risiko duplikasi.',
  },
  response: {
    200: t.Object({
      totalRecords: t.Integer(),
      totalMenit: t.Integer(),
      duplicateRiskCount: t.Integer(),
      perJenis: t.Object({
        sakit: t.Object({ count: t.Integer(), totalMenit: t.Integer() }),
        izin: t.Object({ count: t.Integer(), totalMenit: t.Integer() }),
        alpa: t.Object({ count: t.Integer(), totalMenit: t.Integer() }),
        terlambat: t.Object({ count: t.Integer(), totalMenit: t.Integer() }),
        rusak: t.Object({ count: t.Integer(), totalMenit: t.Integer() }),
      }),
    }),
    400: t.Object({ error: t.String() }),
  },
};

export const getAllKompensasiManualSchema = {
  detail: {
    tags: ['Kompensasi Manual'],
    summary: 'Daftar Kompensasi Manual Mahasiswa',
    description:
      'Mengambil daftar seluruh kompensasi manual dengan filter pencarian, tanggal, jenis kompensasi, dan paginasi.',
  },
  query: t.Object({
    search: t.Optional(t.String()),
    tanggal: t.Optional(t.String()),
    jenisKompen: t.Optional(t.String()),
    page: t.Optional(t.Numeric()),
    limit: t.Optional(t.Numeric()),
    sortBy: t.Optional(t.String()),
    sortOrder: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
  }),
  response: {
    200: t.Object({
      data: t.Array(
        t.Object({
          id: t.Integer(),
          mahasiswaId: t.Integer(),
          mahasiswaNim: t.String(),
          mahasiswaNama: t.String(),
          tanggal: t.String(),
          jenisKompen: t.String(),
          durasiMenit: t.Integer(),
          keterangan: t.Union([t.String(), t.Null()]),
          createdBy: t.Union([t.Integer(), t.Null()]),
          createdAt: t.Union([t.Date(), t.Null()], { default: null }),
          updatedAt: t.Union([t.Date(), t.Null()], { default: null }),
        }),
      ),
      meta: t.Object({
        page: t.Integer(),
        limit: t.Integer(),
        total: t.Integer(),
        totalPages: t.Integer(),
      }),
    }),
    400: t.Object({ error: t.String() }),
    403: t.Object({ error: t.String() }),
  },
};

export const importKompensasiManualSchema = {
  detail: {
    tags: ['Kompensasi Manual'],
    summary: 'Impor Data Kompensasi Mahasiswa via CSV',
    description:
      'Mengimpor data kompensasi manual melalui file CSV. Kolom: nim, tanggal, jenis_kompen (alpa/sakit/izin/rusak/terlambat atau kode A/S/I/R/T), durasi_menit, keterangan.',
  },
  response: {
    200: t.Object({
      successCount: t.Integer(),
      skippedCount: t.Integer(),
      errors: t.Array(t.Object({ line: t.Integer(), error: t.String() })),
    }),
    400: t.Object({ error: t.String() }),
    403: t.Object({ error: t.String() }),
  },
};

import { t } from 'elysia';

export const generateTagihanBody = t.Object({
  periodeId: t.String({ default: '20231' }),
  nominal: t.Optional(t.Numeric({ default: 5000000 })),
});

export const tagihanResponseObject = t.Object({
  id: t.Integer({ default: 1 }),
  mahasiswaId: t.Integer({ default: 1 }),
  periodeId: t.String({ default: '20231' }),
  nominal: t.Numeric({ default: 5000000 }),
  nominalTerbayar: t.Numeric({ default: 0 }),
  status: t.String({ default: 'belum_bayar' }),
  tanggalBayar: t.Any(),
  createdAt: t.Any(),
  updatedAt: t.Any(),
  mahasiswa: t.Union([
    t.Object({
      id: t.Integer(),
      nim: t.String(),
      nama: t.String(),
      email: t.String(),
      status: t.String(),
    }),
    t.Null(),
  ]),
});

export const getTagihanSchema = {
  detail: {
    tags: ['Tagihan'],
    summary: 'Daftar Tagihan SPP',
    description: 'Mengambil semua data tagihan SPP dengan pagination, filter pencarian NIM/nama mahasiswa, dan status.',
  },
  query: t.Object({
    page: t.Optional(t.Numeric({ default: 1 })),
    limit: t.Optional(t.Numeric({ default: 10 })),
    status: t.Optional(t.String()),
    search: t.Optional(t.String({ default: '' })),
  }),
  response: {
    200: t.Object({
      data: t.Array(tagihanResponseObject),
      meta: t.Object({
        total: t.Integer({ default: 1 }),
        page: t.Integer({ default: 1 }),
        limit: t.Integer({ default: 10 }),
        totalPages: t.Integer({ default: 1 }),
      }),
    }),
  },
};

export const generateTagihanSchema = {
  detail: {
    tags: ['Tagihan'],
    summary: 'Generate Tagihan Massal',
    description: 'Membuat tagihan SPP otomatis untuk seluruh mahasiswa aktif pada periode akademik tertentu.',
  },
  body: generateTagihanBody,
  response: {
    201: t.Object({
      message: t.String({ default: 'Tagihan berhasil dibuat secara massal' }),
      count: t.Integer({ default: 10 }),
    }),
    400: t.Object({
      error: t.String(),
    }),
    403: t.Object({
      error: t.String({ default: 'Akses ditolak.' }),
    }),
  },
};

export const getStatsTagihanSchema = {
  detail: {
    tags: ['Tagihan'],
    summary: 'Statistik Tagihan SPP',
    description: 'Mengambil statistik tagihan SPP (total tagihan, total terbayar, status per periode).',
  },
};

export const updateNominalSchema = {
  detail: {
    tags: ['Tagihan'],
    summary: 'Update Nominal Tagihan',
    description: 'Memperbarui nominal tagihan SPP berdasarkan ID.',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
  body: t.Object({
    nominal: t.Numeric(),
  }),
};

export const getRiwayatTransaksiSchema = {
  detail: {
    tags: ['Tagihan'],
    summary: 'Riwayat Transaksi Tagihan',
    description: 'Mengambil riwayat transaksi pembayaran untuk suatu tagihan.',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
};

export const voidTransaksiSchema = {
  detail: {
    tags: ['Tagihan'],
    summary: 'Void/Batalkan Transaksi',
    description: 'Membatalkan transaksi pembayaran tagihan (void).',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
};

export const getAllTarifSchema = {
  detail: {
    tags: ['Tagihan'],
    summary: 'Daftar Skema Tarif SPP',
    description: 'Mengambil semua skema tarif SPP yang terdaftar per angkatan/prodi.',
  },
};

export const createTarifSchema = {
  detail: {
    tags: ['Tagihan'],
    summary: 'Buat Skema Tarif Baru',
    description: 'Menambahkan skema tarif SPP baru untuk angkatan/prodi tertentu.',
  },
  body: t.Object({
    programStudiId: t.Optional(t.Integer()),
    angkatan: t.Optional(t.String()),
    nominal: t.Numeric(),
    periodeId: t.Optional(t.String()),
  }),
};

export const deleteTarifSchema = {
  detail: {
    tags: ['Tagihan'],
    summary: 'Hapus Skema Tarif',
    description: 'Menghapus skema tarif SPP berdasarkan ID.',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
};

export const bayarTagihanSchema = {
  detail: {
    tags: ['Tagihan'],
    summary: 'Bayar/Validasi Pembayaran Tagihan',
    description: 'Melakukan pencatatan pembayaran tagihan SPP dan secara otomatis mengaktifkan status mahasiswa.',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
  body: t.Optional(
    t.Object({
      nominalBayar: t.Optional(t.Numeric()),
    }),
  ),
  response: {
    200: t.Object({
      message: t.String({ default: 'Pembayaran berhasil dan mahasiswa diaktifkan' }),
      tagihan: t.Object({
        id: t.Integer(),
        status: t.String(),
        tanggalBayar: t.Any(),
      }),
    }),
    400: t.Object({
      error: t.String(),
    }),
    403: t.Object({
      error: t.String({ default: 'Akses ditolak.' }),
    }),
    404: t.Object({
      error: t.String({ default: 'Tagihan tidak ditemukan' }),
    }),
  },
};

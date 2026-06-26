import { t } from 'elysia';

export const generateTagihanBody = t.Object({
  periodeId: t.String({ default: '20231' })
});

export const tagihanResponseObject = t.Object({
  id: t.Integer({ default: 1 }),
  mahasiswaId: t.Integer({ default: 1 }),
  periodeId: t.String({ default: '20231' }),
  nominal: t.Integer({ default: 5000000 }),
  status: t.String({ default: 'belum_bayar' }),
  tanggalBayar: t.Union([t.String(), t.Null()], { default: null }),
  createdAt: t.Any(),
  updatedAt: t.Any(),
  mahasiswa: t.Union([
    t.Object({
      id: t.Integer(),
      nim: t.String(),
      nama: t.String(),
      email: t.String(),
      status: t.String()
    }),
    t.Null()
  ])
});

export const getTagihanSchema = {
  detail: {
    tags: ['Tagihan'],
    summary: 'Daftar Tagihan SPP',
    description: 'Mengambil semua data tagihan SPP dengan pagination, filter pencarian NIM/nama mahasiswa, dan status.'
  },
  query: t.Object({
    page: t.Optional(t.Numeric({ default: 1 })),
    limit: t.Optional(t.Numeric({ default: 10 })),
    status: t.Optional(t.String()),
    search: t.Optional(t.String({ default: '' }))
  }),
  response: {
    200: t.Object({
      data: t.Array(tagihanResponseObject),
      meta: t.Object({
        total: t.Integer({ default: 1 }),
        page: t.Integer({ default: 1 }),
        limit: t.Integer({ default: 10 }),
        totalPages: t.Integer({ default: 1 })
      })
    })
  }
};

export const generateTagihanSchema = {
  detail: {
    tags: ['Tagihan'],
    summary: 'Generate Tagihan Massal',
    description: 'Membuat tagihan SPP otomatis untuk seluruh mahasiswa aktif pada periode akademik tertentu.'
  },
  body: generateTagihanBody,
  response: {
    201: t.Object({
      message: t.String({ default: 'Tagihan berhasil dibuat secara massal' }),
      count: t.Integer({ default: 10 })
    }),
    400: t.Object({
      error: t.String()
    }),
    403: t.Object({
      error: t.String({ default: 'Akses ditolak.' })
    })
  }
};

export const bayarTagihanSchema = {
  detail: {
    tags: ['Tagihan'],
    summary: 'Bayar/Validasi Pembayaran Tagihan',
    description: 'Melakukan pencatatan pembayaran tagihan SPP dan secara otomatis mengaktifkan status mahasiswa.'
  },
  params: t.Object({
    id: t.Numeric()
  }),
  response: {
    200: t.Object({
      message: t.String({ default: 'Pembayaran berhasil dan mahasiswa diaktifkan' }),
      tagihan: t.Object({
        id: t.Integer(),
        status: t.String(),
        tanggalBayar: t.Any()
      })
    }),
    400: t.Object({
      error: t.String()
    }),
    403: t.Object({
      error: t.String({ default: 'Akses ditolak.' })
    }),
    404: t.Object({
      error: t.String({ default: 'Tagihan tidak ditemukan' })
    })
  }
};

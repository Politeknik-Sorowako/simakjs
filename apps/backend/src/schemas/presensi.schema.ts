import { t } from 'elysia';

export const presensiItem = t.Object({
  mahasiswaId: t.Integer(),
  status: t.String({ default: 'hadir' }), // 'hadir', 'sakit', 'izin', 'telat', 'alpa'
  durasiMangkir: t.Optional(t.Integer({ default: 0 })),
  keterangan: t.Optional(t.Nullable(t.String())),
});

export const bulkPresensiBody = t.Object({
  bapId: t.Integer(),
  presensiList: t.Array(presensiItem),
});

export const saveBulkPresensiSchema = {
  detail: {
    tags: ['Presensi'],
    summary: 'Simpan Presensi Harian',
    description: 'Menyimpan data presensi mahasiswa untuk satu pertemuan/BAP secara massal.',
  },
  body: bulkPresensiBody,
  response: {
    200: t.Object({
      message: t.String({ default: 'Presensi berhasil disimpan' }),
    }),
  },
};

export const bayarKompensasiBody = t.Object({
  mahasiswaId: t.Integer(),
  jumlahMenit: t.Integer({ default: 60 }),
  tanggal: t.String({ default: '2026-06-27' }),
  keterangan: t.String({ default: 'Membersihkan Laboratorium Komputer' }),
});

export const bayarKompensasiSchema = {
  detail: {
    tags: ['Kompensasi'],
    summary: 'Input Pembayaran Kompensasi',
    description: 'Mencatatkan pengurangan jam kompensasi mahasiswa.',
  },
  body: bayarKompensasiBody,
  response: {
    200: t.Object({
      message: t.String({ default: 'Pembayaran kompensasi berhasil dicatat' }),
    }),
  },
};

export const getKompensasiMahasiswaDetailSchema = {
  detail: {
    tags: ['Kompensasi'],
    summary: 'Detail Kompensasi Mahasiswa',
    description: 'Mengambil detail riwayat kompensasi (absen mangkir) dan pembayaran kompensasi mahasiswa.',
  },
  params: t.Object({
    mahasiswaId: t.Numeric(),
  }),
  response: {
    200: t.Object({
      mahasiswa: t.Optional(
        t.Object({
          id: t.Optional(t.Integer({ default: 1 })),
          nim: t.Optional(t.String({ default: '202301001' })),
          nama: t.Optional(t.String({ default: 'Andi Pratama' })),
          email: t.Optional(t.String({ default: 'andi@example.com' })),
          programStudiId: t.Optional(t.Union([t.Integer(), t.Null()], { default: 1 })),
        }),
      ),
      historyKompensasi: t.Optional(
        t.Array(
          t.Object({
            id: t.Optional(t.Integer({ default: 1 })),
            bapId: t.Optional(t.Nullable(t.Integer())),
            status: t.Optional(t.String({ default: 'alpa' })),
            durasiMangkir: t.Optional(t.Integer({ default: 120 })),
            createdAt: t.Optional(t.Union([t.Date(), t.Null()])),
            bapPertemuan: t.Optional(t.Nullable(t.Integer())),
            bapMateri: t.Optional(t.Nullable(t.String())),
            bapTanggal: t.Optional(t.Nullable(t.String())),
            sumber: t.Optional(t.String({ default: 'perkuliahan' })),
            poinKompensasi: t.Optional(t.Integer({ default: 120 })),
          }),
        ),
      ),
      payments: t.Optional(
        t.Array(
          t.Object({
            id: t.Optional(t.Integer({ default: 1 })),
            mahasiswaId: t.Optional(t.Integer({ default: 1 })),
            jumlahMenit: t.Optional(t.Integer({ default: 60 })),
            tanggal: t.Optional(t.String({ default: '2026-06-27' })),
            keterangan: t.Optional(t.String({ default: 'Membersihkan Laboratorium' })),
            petugasId: t.Optional(t.Union([t.Integer(), t.Null()], { default: 1 })),
            createdAt: t.Optional(t.Union([t.Date(), t.Null()])),
          }),
        ),
      ),
      summary: t.Optional(
        t.Object({
          totalKompensasi: t.Optional(t.Integer({ default: 120 })),
          totalDibayar: t.Optional(t.Integer({ default: 60 })),
          sisaKompensasi: t.Optional(t.Integer({ default: 60 })),
        }),
      ),
    }),
  },
};

export const getByBapSchema = {
  detail: {
    tags: ['Presensi'],
    summary: 'Daftar Presensi per BAP',
    description: 'Mengambil daftar kehadiran mahasiswa berdasarkan ID BAP.',
  },
  params: t.Object({
    bapId: t.Numeric(),
  }),
  response: {
    200: t.Array(
      t.Object({
        id: t.Integer({ default: 1 }),
        mahasiswaId: t.Integer({ default: 1 }),
        mahasiswaNim: t.String({ default: '202301001' }),
        mahasiswaNama: t.String({ default: 'Andi Pratama' }),
        status: t.String({ default: 'hadir' }),
        durasiMangkir: t.Integer({ default: 0 }),
        keterangan: t.Union([t.String(), t.Null()]),
      }),
    ),
  },
};

export const getLaporanKompensasiSchema = {
  detail: {
    tags: ['Kompensasi'],
    summary: 'Laporan Rekapitulasi Kompensasi',
    description: 'Mengambil laporan/rekapitulasi data kompensasi mahasiswa dengan pagination dan filter.',
  },
  query: t.Object({
    page: t.Optional(t.String({ default: '1' })),
    limit: t.Optional(t.String({ default: '20' })),
    search: t.Optional(t.String()),
    prodiId: t.Optional(t.String()),
    sortBy: t.Optional(t.String({ default: 'sisa' })),
    sortOrder: t.Optional(t.String({ default: 'desc' })),
    statusLunas: t.Optional(t.String()),
    exportAll: t.Optional(t.String()),
  }),
  response: {
    200: t.Object({
      data: t.Array(
        t.Object({
          id: t.Integer(),
          nim: t.String(),
          nama: t.String(),
          prodiNama: t.Union([t.String(), t.Null()]),
          totalKompensasi: t.Integer(),
          totalDibayar: t.Integer(),
          sisaKompensasi: t.Integer(),
        }),
      ),
      meta: t.Object({
        total: t.Integer(),
        page: t.Integer(),
        limit: t.Integer(),
        totalPages: t.Integer(),
      }),
    }),
  },
};

export const getKompensasiStatsSchema = {
  detail: {
    tags: ['Kompensasi'],
    summary: 'Statistik Kompensasi',
    description: 'Mengambil statistik kompensasi keterlambatan/mangkir mahasiswa.',
  },
};

export const getRekapKehadiranSchema = {
  detail: {
    tags: ['Presensi'],
    summary: 'Rekapitulasi Kehadiran',
    description: 'Mengambil rekapitulasi kehadiran per kelas kuliah untuk periode tertentu.',
  },
};

export const getRekapKehadiranMahasiswaSchema = {
  detail: {
    tags: ['Presensi'],
    summary: 'Rekapitulasi Kehadiran Mahasiswa',
    description: 'Mengambil rekapitulasi kehadiran per mahasiswa untuk seluruh kelas perkuliahan.',
  },
};

export const updateKompensasiBayarSchema = {
  detail: {
    tags: ['Kompensasi'],
    summary: 'Update Penyelesaian Kompensasi',
    description: 'Mengubah catatan pelunasan/penyelesaian kompensasi mahasiswa berdasarkan ID.',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
  body: t.Partial(
    t.Object({
      jumlahMenit: t.Optional(t.Integer()),
      tanggal: t.Optional(t.String()),
      keterangan: t.Optional(t.String()),
    }),
  ),
  response: {
    200: t.Object({
      id: t.Integer(),
      mahasiswaId: t.Integer(),
      jumlahMenit: t.Integer(),
      tanggal: t.String(),
      keterangan: t.String(),
      petugasId: t.Union([t.Integer(), t.Null()]),
      createdAt: t.Union([t.Date(), t.Null()], { default: null }),
      updatedAt: t.Union([t.Date(), t.Null()], { default: null }),
    }),
    400: t.Object({ error: t.String() }),
    403: t.Object({ error: t.String() }),
    404: t.Object({ error: t.String() }),
  },
};

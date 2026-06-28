import { t } from 'elysia';

export const presensiItem = t.Object({
  mahasiswaId: t.Integer(),
  status: t.String({ default: 'hadir' }), // 'hadir', 'sakit', 'izin', 'telat', 'alpa'
  durasiMangkir: t.Optional(t.Integer({ default: 0 })),
});

export const bulkPresensiBody = t.Object({
  bapId: t.Integer(),
  presensiList: t.Array(presensiItem),
});

export const saveBulkPresensiSchema = {
  detail: {
    tags: ['Presensi'],
    summary: 'Simpan Presensi Harian',
    description: 'Menyimpan data presensi mahasiswa untuk satu pertemuan/BAP secara massal.'
  },
  body: bulkPresensiBody,
  response: {
    200: t.Object({
      message: t.String({ default: 'Presensi berhasil disimpan' })
    })
  }
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
    description: 'Mencatatkan pengurangan jam kompensasi mahasiswa.'
  },
  body: bayarKompensasiBody,
  response: {
    200: t.Object({
      message: t.String({ default: 'Pembayaran kompensasi berhasil dicatat' })
    })
  }
};

export const getKompensasiMahasiswaDetailSchema = {
  detail: {
    tags: ['Kompensasi'],
    summary: 'Detail Kompensasi Mahasiswa',
    description: 'Mengambil detail riwayat kompensasi (absen mangkir) dan pembayaran kompensasi mahasiswa.'
  },
  params: t.Object({
    mahasiswaId: t.Numeric()
  }),
  response: {
    200: t.Object({
      mahasiswa: t.Optional(t.Object({
        id: t.Optional(t.Integer({ default: 1 })),
        nim: t.Optional(t.String({ default: '202301001' })),
        nama: t.Optional(t.String({ default: 'Andi Pratama' })),
        email: t.Optional(t.String({ default: 'andi@example.com' })),
        programStudiId: t.Optional(t.Union([t.Integer(), t.Null()], { default: 1 }))
      })),
      historyKompensasi: t.Optional(t.Array(t.Object({
        id: t.Optional(t.Integer({ default: 1 })),
        bapId: t.Optional(t.Integer({ default: 1 })),
        status: t.Optional(t.String({ default: 'alpa' })),
        durasiMangkir: t.Optional(t.Integer({ default: 120 })),
        createdAt: t.Optional(t.Any()),
        bapPertemuan: t.Optional(t.Integer({ default: 1 })),
        bapMateri: t.Optional(t.String({ default: 'Dasar Pemrograman' })),
        bapTanggal: t.Optional(t.String({ default: '2026-06-27' })),
        poinKompensasi: t.Optional(t.Integer({ default: 120 }))
      }))),
      payments: t.Optional(t.Array(t.Object({
        id: t.Optional(t.Integer({ default: 1 })),
        mahasiswaId: t.Optional(t.Integer({ default: 1 })),
        jumlahMenit: t.Optional(t.Integer({ default: 60 })),
        tanggal: t.Optional(t.String({ default: '2026-06-27' })),
        keterangan: t.Optional(t.String({ default: 'Membersihkan Laboratorium' })),
        petugasId: t.Optional(t.Union([t.Integer(), t.Null()], { default: 1 })),
        createdAt: t.Optional(t.Any())
      }))),
      summary: t.Optional(t.Object({
        totalKompensasi: t.Optional(t.Integer({ default: 120 })),
        totalDibayar: t.Optional(t.Integer({ default: 60 })),
        sisaKompensasi: t.Optional(t.Integer({ default: 60 }))
      }))
    })
  }
};

export const getByBapSchema = {
  detail: {
    tags: ['Presensi'],
    summary: 'Daftar Presensi per BAP',
    description: 'Mengambil daftar kehadiran mahasiswa berdasarkan ID BAP.'
  },
  params: t.Object({
    bapId: t.Numeric()
  }),
  response: {
    200: t.Array(t.Object({
      id: t.Integer({ default: 1 }),
      mahasiswaId: t.Integer({ default: 1 }),
      mahasiswaNim: t.String({ default: '202301001' }),
      mahasiswaNama: t.String({ default: 'Andi Pratama' }),
      status: t.String({ default: 'hadir' }),
      durasiMangkir: t.Integer({ default: 0 })
    }))
  }
};

export const getLaporanKompensasiSchema = {
  detail: {
    tags: ['Kompensasi'],
    summary: 'Laporan Rekapitulasi Kompensasi',
    description: 'Mengambil laporan/rekapitulasi seluruh data kompensasi mahasiswa yang memuat jumlah menit alpa/mangkir dan status penyelesaian.'
  },
  response: {
    200: t.Array(t.Object({
      id: t.Optional(t.Integer({ default: 1 })),
      nim: t.Optional(t.String({ default: '202301001' })),
      nama: t.Optional(t.String({ default: 'Andi Pratama' })),
      prodiNama: t.Optional(t.Union([t.String(), t.Null()], { default: 'Teknik Elektro' })),
      totalKompensasi: t.Optional(t.Integer({ default: 120 })),
      totalDibayar: t.Optional(t.Integer({ default: 60 })),
      sisaKompensasi: t.Optional(t.Integer({ default: 60 }))
    }))
  }
};


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
};

export const getKompensasiMahasiswaDetailSchema = {
  detail: {
    tags: ['Kompensasi'],
    summary: 'Detail Kompensasi Mahasiswa',
    description: 'Mengambil detail riwayat kompensasi (absen mangkir) dan pembayaran kompensasi mahasiswa.'
  },
  params: t.Object({
    mahasiswaId: t.Numeric()
  })
};

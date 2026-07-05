import { t } from 'elysia';

export const createMahasiswaKeluarSchema = {
  detail: {
    tags: ['Mahasiswa Keluar'],
    summary: 'Catat Mahasiswa Keluar/DO',
    description: 'Mencatat status keluar, drop out, pindah, atau wafat untuk mahasiswa (Hanya Admin/Prodi).'
  },
  body: t.Object({
    mahasiswaId: t.Integer({ default: 1 }),
    periodeId: t.String({ default: '20241' }),
    statusBaru: t.Union([
      t.Literal('keluar'),
      t.Literal('drop_out'),
      t.Literal('pindah'),
      t.Literal('wafat'),
      t.Literal('non_aktif')
    ], { default: 'keluar' }),
    tanggalKeluar: t.String({ default: '2024-07-04' }),
    alasanKeluar: t.Optional(t.String()),
    noSk: t.Optional(t.String()),
    tanggalSk: t.Optional(t.String()),
    ipk: t.Optional(t.Numeric()),
    nomorIjazah: t.Optional(t.String())
  })
};

export const getMahasiswaKeluarSchema = {
  detail: {
    tags: ['Mahasiswa Keluar'],
    summary: 'Daftar Riwayat Mahasiswa Keluar',
    description: 'Mengambil daftar riwayat mahasiswa yang dinonaktifkan/keluar.'
  },
  query: t.Object({
    page: t.Optional(t.Numeric({ default: 1 })),
    limit: t.Optional(t.Numeric({ default: 10 })),
    search: t.Optional(t.String({ default: '' })),
    periodeId: t.Optional(t.String())
  })
};

export const deleteMahasiswaKeluarSchema = {
  detail: {
    tags: ['Mahasiswa Keluar'],
    summary: 'Batalkan Status Keluar',
    description: 'Menghapus riwayat status keluar dan mengembalikan mahasiswa menjadi aktif.'
  },
  params: t.Object({
    id: t.Numeric()
  })
};

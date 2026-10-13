import { t } from 'elysia';

export const createMahasiswaKeluarSchema = {
  detail: {
    tags: ['Mahasiswa Keluar'],
    summary: 'Catat Mahasiswa Keluar/DO',
    description: 'Mencatat status keluar, drop out, pindah, atau wafat untuk mahasiswa (Hanya Admin/Prodi).',
  },
  body: t.Object({
    mahasiswaId: t.Integer({ default: 1 }),
    periodeId: t.String({ default: '20241' }),
    statusBaru: t.Union(
      [t.Literal('keluar'), t.Literal('drop_out'), t.Literal('pindah'), t.Literal('wafat'), t.Literal('non_aktif')],
      { default: 'keluar' },
    ),
    tanggalKeluar: t.String({ default: '2024-07-04' }),
    alasanKeluar: t.Optional(t.String()),
    noSk: t.Optional(t.String()),
    tanggalSk: t.Optional(t.String()),
    ipk: t.Optional(t.Numeric()),
    nomorIjazah: t.Optional(t.String()),
  }),
};

export const getMahasiswaKeluarSchema = {
  detail: {
    tags: ['Mahasiswa Keluar'],
    summary: 'Daftar Riwayat Mahasiswa Keluar',
    description: 'Mengambil daftar riwayat mahasiswa yang dinonaktifkan/keluar.',
  },
  query: t.Object({
    page: t.Optional(t.Numeric({ default: 1 })),
    limit: t.Optional(t.Numeric({ default: 10 })),
    search: t.Optional(t.String({ default: '' })),
    periodeId: t.Optional(t.String()),
  }),
};

export const getMahasiswaKeluarStatsSchema = {
  detail: {
    tags: ['Mahasiswa Keluar'],
    summary: 'Statistik Mahasiswa Keluar',
    description: 'Mengambil statistik jumlah mahasiswa yang keluar/DO per periode, per prodi, per status.',
  },
};

export const deleteMahasiswaKeluarSchema = {
  detail: {
    tags: ['Mahasiswa Keluar'],
    summary: 'Batalkan Status Keluar',
    description: 'Menghapus riwayat status keluar dan mengembalikan mahasiswa menjadi aktif.',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
};

export const updateMahasiswaKeluarSchema = {
  detail: {
    tags: ['Mahasiswa Keluar'],
    summary: 'Edit Data Mahasiswa Keluar',
    description:
      'Admin/Prodi mengedit riwayat keluar/non-aktif. Jika statusBaru berubah, status mahasiswa ikut disinkronkan.',
  },
  params: t.Object({ id: t.Numeric() }),
  body: t.Object({
    periodeId: t.Optional(t.String()),
    statusBaru: t.Optional(
      t.Union([
        t.Literal('keluar'),
        t.Literal('drop_out'),
        t.Literal('pindah'),
        t.Literal('wafat'),
        t.Literal('non_aktif'),
      ]),
    ),
    tanggalKeluar: t.Optional(t.String()),
    alasanKeluar: t.Optional(t.Union([t.String(), t.Null()])),
    noSk: t.Optional(t.Union([t.String({ maxLength: 100 }), t.Null()])),
    tanggalSk: t.Optional(t.Union([t.String(), t.Null()])),
    ipk: t.Optional(t.Union([t.Numeric(), t.Null()])),
    nomorIjazah: t.Optional(t.Union([t.String({ maxLength: 100 }), t.Null()])),
  }),
};

export const listLampiranKeluarSchema = {
  detail: { tags: ['Mahasiswa Keluar'], summary: 'Daftar Lampiran Mahasiswa Keluar' },
  params: t.Object({ id: t.Numeric() }),
};

export const uploadLampiranKeluarSchema = {
  detail: {
    tags: ['Mahasiswa Keluar'],
    summary: 'Unggah Lampiran Mahasiswa Keluar',
    description: 'Unggah Surat SK (jenis=sk, menggantikan yang lama) atau berkas pendukung. Opsional.',
  },
  params: t.Object({ id: t.Numeric() }),
  body: t.Object({
    file: t.File(),
    jenis: t.Union([t.Literal('sk'), t.Literal('pendukung')]),
    keterangan: t.Optional(t.String({ maxLength: 255 })),
  }),
};

export const lampiranKeluarParamsSchema = {
  detail: { tags: ['Mahasiswa Keluar'], summary: 'Unduh / Hapus Lampiran Mahasiswa Keluar' },
  params: t.Object({ id: t.Numeric(), lampiranId: t.Numeric() }),
};

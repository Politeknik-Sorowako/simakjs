import { t } from 'elysia';

export const createCutiSchema = {
  detail: {
    tags: ['Cuti'],
    summary: 'Ajukan Cuti Baru',
    description: 'Mengajukan cuti akademik baru (Hanya diakses Mahasiswa).',
  },
  body: t.Object({
    periodeId: t.String({ default: '20241' }),
    alasan: t.String({ default: 'Alasan pribadi/keluarga' }),
  }),
};

export const inputCutiSchema = {
  detail: {
    tags: ['Cuti'],
    summary: 'Input Cuti oleh Admin',
    description: 'Admin/Prodi menginputkan cuti mahasiswa secara langsung (langsung disetujui).',
  },
  body: t.Object({
    mahasiswaId: t.Numeric(),
    periodeId: t.String(),
    alasan: t.String(),
    semesterMulaiCuti: t.Optional(t.String()),
    semesterBerakhirCuti: t.Optional(t.String()),
    noSuratIzin: t.Optional(t.String()),
    tanggalSuratIzin: t.Optional(t.String()),
  }),
};

export const getCutiSchema = {
  detail: {
    tags: ['Cuti'],
    summary: 'Daftar Pengajuan Cuti',
    description: 'Mengambil daftar pengajuan cuti dengan filter.',
  },
  query: t.Object({
    page: t.Optional(t.Numeric({ default: 1 })),
    limit: t.Optional(t.Numeric({ default: 10 })),
    periodeId: t.Optional(t.String()),
    status: t.Optional(t.String()),
  }),
};

export const getMahasiswaCutiSchema = {
  detail: {
    tags: ['Cuti'],
    summary: 'Daftar Mahasiswa Cuti',
    description: 'Mengambil daftar mahasiswa yang sedang berstatus cuti.',
  },
  query: t.Object({
    page: t.Optional(t.Numeric({ default: 1 })),
    limit: t.Optional(t.Numeric({ default: 10 })),
    search: t.Optional(t.String()),
    periodeId: t.Optional(t.String()),
  }),
};

export const approveCutiSchema = {
  detail: {
    tags: ['Cuti'],
    summary: 'Persetujuan Pengajuan Cuti',
    description: 'Menyetujui atau menolak pengajuan cuti (PA, Keuangan, atau Admin/Prodi).',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
  body: t.Object({
    action: t.Union([t.Literal('approve'), t.Literal('reject')]),
    catatan: t.Optional(t.String()),
    noSuratIzin: t.Optional(t.String()),
    tanggalSuratIzin: t.Optional(t.String()),
  }),
};

export const deleteCutiSchema = {
  detail: {
    tags: ['Cuti'],
    summary: 'Hapus Pengajuan Cuti',
    description:
      'Menghapus pengajuan cuti. Admin/Prodi dapat menghapus kapan saja, mahasiswa hanya jika masih pending.',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
};

export const aktifKembaliSchema = {
  detail: {
    tags: ['Cuti'],
    summary: 'Aktifkan Kembali Mahasiswa Cuti',
    description: 'Mengembalikan mahasiswa dari status cuti menjadi aktif.',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
};

import { t } from 'elysia';

export const createCutiSchema = {
  detail: {
    tags: ['Cuti'],
    summary: 'Ajukan Cuti Baru',
    description: 'Mengajukan cuti akademik baru (Hanya diakses Mahasiswa).'
  },
  body: t.Object({
    periodeId: t.String({ default: '20241' }),
    alasan: t.String({ default: 'Alasan pribadi/keluarga' })
  })
};

export const getCutiSchema = {
  detail: {
    tags: ['Cuti'],
    summary: 'Daftar Pengajuan Cuti',
    description: 'Mengambil daftar pengajuan cuti dengan filter.'
  },
  query: t.Object({
    page: t.Optional(t.Numeric({ default: 1 })),
    limit: t.Optional(t.Numeric({ default: 10 })),
    periodeId: t.Optional(t.String()),
    status: t.Optional(t.String())
  })
};

export const approveCutiSchema = {
  detail: {
    tags: ['Cuti'],
    summary: 'Persetujuan Pengajuan Cuti',
    description: 'Menyetujui atau menolak pengajuan cuti (PA, Keuangan, atau Admin/Prodi).'
  },
  params: t.Object({
    id: t.Numeric()
  }),
  body: t.Object({
    action: t.Union([t.Literal('approve'), t.Literal('reject')]),
    catatan: t.Optional(t.String()),
    noSuratIzin: t.Optional(t.String()),
    tanggalSuratIzin: t.Optional(t.String())
  })
};

export const deleteCutiSchema = {
  detail: {
    tags: ['Cuti'],
    summary: 'Hapus Pengajuan Cuti',
    description: 'Menghapus pengajuan cuti (Hanya jika status pending).'
  },
  params: t.Object({
    id: t.Numeric()
  })
};

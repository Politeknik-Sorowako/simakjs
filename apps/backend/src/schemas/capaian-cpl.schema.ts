import { t } from 'elysia';

export const getCapaianCplByMahasiswaSchema = {
  detail: {
    tags: ['Capaian CPL'],
    summary: 'Capaian CPL per Mahasiswa',
    description: 'Mengambil capaian CPL untuk satu mahasiswa.',
  },
  params: t.Object({
    mahasiswaId: t.Numeric(),
  }),
};

export const getCapaianCplRekapSchema = {
  detail: {
    tags: ['Capaian CPL'],
    summary: 'Rekap Capaian CPL',
    description: 'Mengambil rekap rata-rata capaian CPL per kurikulum/periode.',
  },
  query: t.Object({
    kurikulumId: t.Optional(t.Numeric()),
    periodeId: t.Optional(t.String()),
  }),
};

export const hitungBatchCapaianCplBody = t.Object({
  kurikulumId: t.Numeric(),
  periodeId: t.Optional(t.String()),
});

export const hitungBatchCapaianCplSchema = {
  detail: {
    tags: ['Capaian CPL'],
    summary: 'Hitung Batch Capaian CPL',
    description: 'Menghitung capaian CPL untuk semua mahasiswa dalam kurikulum.',
  },
  body: hitungBatchCapaianCplBody,
};

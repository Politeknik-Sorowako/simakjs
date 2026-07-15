import { t } from 'elysia';

export const getObeSummarySchema = {
  detail: {
    tags: ['Laporan OBE'],
    summary: 'Ringkasan OBE per Prodi',
    description: 'Mengambil ringkasan data OBE (Profil Lulusan, CPL, BK, mapping) per program studi.',
  },
  query: t.Object({
    prodiId: t.Numeric(),
  }),
};

export const getCplCpmkCoverageSchema = {
  detail: {
    tags: ['Laporan OBE'],
    summary: 'Cakupan CPL oleh CPMK',
    description: 'Menganalisis CPL yang sudah/belum dicakup oleh CPMK dalam kurikulum tertentu.',
  },
  query: t.Object({
    kurikulumId: t.Numeric(),
  }),
};

export const getBkMkCoverageSchema = {
  detail: {
    tags: ['Laporan OBE'],
    summary: 'Cakupan BK oleh Mata Kuliah',
    description: 'Menganalisis Bahan Kajian yang sudah/belum diturunkan ke Mata Kuliah dalam kurikulum tertentu.',
  },
  query: t.Object({
    kurikulumId: t.Numeric(),
  }),
};

export const getCpmkAchievementSchema = {
  detail: {
    tags: ['Laporan OBE'],
    summary: 'Capaian CPMK per Kelas',
    description: 'Mengambil rekap capaian CPMK untuk semua mahasiswa di satu kelas.',
  },
  params: t.Object({
    kelasKuliahId: t.Numeric(),
  }),
};

export const getCplAchievementSchema = {
  detail: {
    tags: ['Laporan OBE'],
    summary: 'Capaian CPL',
    description: 'Mengambil rekap capaian CPL per kurikulum/periode.',
  },
  query: t.Object({
    kurikulumId: t.Optional(t.Numeric()),
    periodeId: t.Optional(t.String()),
  }),
};

export const getEvaluasiRekapSchema = {
  detail: {
    tags: ['Laporan OBE'],
    summary: 'Rekap Evaluasi Kurikulum',
    description: 'Mengambil rekap evaluasi kurikulum (PPEPP).',
  },
  params: t.Object({
    kurikulumId: t.Numeric(),
  }),
};

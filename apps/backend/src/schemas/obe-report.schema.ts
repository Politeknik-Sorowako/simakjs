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

import { t } from 'elysia';

export const evaluasiKurikulumBody = t.Object({
  kurikulumId: t.Integer(),
  periodeId: t.Optional(t.String()),
  sumber: t.Optional(t.String()),
  aspek: t.String(),
  temuan: t.String(),
  rekomendasi: t.Optional(t.String()),
  tindakLanjut: t.Optional(t.String()),
  status: t.Optional(t.String()),
});

export const evaluasiKurikulumUpdateBody = t.Object({
  aspek: t.Optional(t.String()),
  temuan: t.Optional(t.String()),
  rekomendasi: t.Optional(t.String()),
  tindakLanjut: t.Optional(t.String()),
  status: t.Optional(t.String()),
});

export const getEvaluasiKurikulumSchema = {
  detail: {
    tags: ['Evaluasi Kurikulum'],
    summary: 'Daftar Evaluasi Kurikulum',
    description: 'Mengambil daftar evaluasi kurikulum dengan pagination.',
  },
  query: t.Object({
    page: t.Optional(t.Numeric()),
    limit: t.Optional(t.Numeric()),
    kurikulumId: t.Optional(t.Numeric()),
    periodeId: t.Optional(t.String()),
    status: t.Optional(t.String()),
  }),
};

export const getEvaluasiKurikulumByIdSchema = {
  detail: {
    tags: ['Evaluasi Kurikulum'],
    summary: 'Detail Evaluasi Kurikulum',
    description: 'Mengambil detail evaluasi kurikulum berdasarkan ID.',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
};

export const createEvaluasiKurikulumSchema = {
  detail: {
    tags: ['Evaluasi Kurikulum'],
    summary: 'Tambah Evaluasi Kurikulum',
    description: 'Menambahkan temuan/rekomendasi evaluasi kurikulum.',
  },
  body: evaluasiKurikulumBody,
};

export const updateEvaluasiKurikulumSchema = {
  detail: {
    tags: ['Evaluasi Kurikulum'],
    summary: 'Update Evaluasi Kurikulum',
    description: 'Mengupdate evaluasi kurikulum.',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
  body: evaluasiKurikulumUpdateBody,
};

export const deleteEvaluasiKurikulumSchema = {
  detail: {
    tags: ['Evaluasi Kurikulum'],
    summary: 'Hapus Evaluasi Kurikulum',
    description: 'Menghapus evaluasi kurikulum berdasarkan ID.',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
};

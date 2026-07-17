import { t } from 'elysia';

export const cpmkCplMappingBody = t.Object({
  cpmkId: t.Integer({ default: 1 }),
  cplId: t.Integer({ default: 1 }),
  bobot: t.Optional(t.Numeric()),
});

export const getCpmkCplMappingSchema = {
  detail: {
    tags: ['CPMK-CPL Mapping'],
    summary: 'Daftar Mapping CPMK ke CPL',
    description: 'Mengambil semua mapping CPMK ke CPL, filter by cpmkId atau cplId.',
  },
  query: t.Object({
    cpmkId: t.Optional(t.Numeric()),
    cplId: t.Optional(t.Numeric()),
    kurikulumId: t.Optional(t.Numeric()),
  }),
};

export const createCpmkCplMappingSchema = {
  detail: {
    tags: ['CPMK-CPL Mapping'],
    summary: 'Tambah Mapping CPMK ke CPL',
    description: 'Menambahkan mapping CPMK ke CPL dengan bobot (Hanya Admin/Dosen/Prodi).',
  },
  body: cpmkCplMappingBody,
};

export const deleteCpmkCplMappingSchema = {
  detail: {
    tags: ['CPMK-CPL Mapping'],
    summary: 'Hapus Mapping CPMK ke CPL',
    description: 'Menghapus mapping CPMK ke CPL berdasarkan ID.',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
};

export const getCpmkCplMatriksSchema = {
  detail: {
    tags: ['CPMK-CPL Mapping'],
    summary: 'Matriks Bobot CPMK ke CPL',
    description: 'Mengambil matriks bobot CPMK ke CPL per kurikulum dengan normalisasi otomatis.',
  },
  query: t.Object({
    kurikulumId: t.Numeric(),
  }),
};

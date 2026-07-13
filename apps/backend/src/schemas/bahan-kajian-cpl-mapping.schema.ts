import { t } from 'elysia';

export const bahanKajianCplMappingBody = t.Object({
  bahanKajianId: t.Integer({ default: 1 }),
  cplId: t.Integer({ default: 1 }),
  bobot: t.Optional(t.Numeric()),
});

export const getBahanKajianCplMappingSchema = {
  detail: {
    tags: ['BK-CPL Mapping'],
    summary: 'Daftar Mapping BK ke CPL',
    description: 'Mengambil semua mapping BK ke CPL, filter by bahanKajianId atau cplId.',
  },
  query: t.Object({
    bahanKajianId: t.Optional(t.Numeric()),
    cplId: t.Optional(t.Numeric()),
    prodiId: t.Optional(t.Numeric()),
  }),
};

export const createBahanKajianCplMappingSchema = {
  detail: {
    tags: ['BK-CPL Mapping'],
    summary: 'Tambah Mapping BK ke CPL',
    description: 'Menambahkan mapping BK ke CPL dengan bobot (Hanya Admin/Prodi).',
  },
  body: bahanKajianCplMappingBody,
};

export const deleteBahanKajianCplMappingSchema = {
  detail: {
    tags: ['BK-CPL Mapping'],
    summary: 'Hapus Mapping BK ke CPL',
    description: 'Menghapus mapping BK ke CPL berdasarkan ID.',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
};

export const getBahanKajianCplMatriksSchema = {
  detail: {
    tags: ['BK-CPL Mapping'],
    summary: 'Matriks Bobot BK ke CPL',
    description: 'Mengambil matriks bobot BK ke CPL per prodi dengan normalisasi otomatis.',
  },
  query: t.Object({
    prodiId: t.Numeric(),
  }),
};

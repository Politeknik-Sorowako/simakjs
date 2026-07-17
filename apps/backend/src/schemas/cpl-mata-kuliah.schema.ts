import { t } from 'elysia';

export const cplMataKuliahBody = t.Object({
  cplId: t.Integer(),
  mataKuliahId: t.Integer(),
  bobot: t.Optional(t.Numeric()),
});

export const cplMataKuliahUpdateBody = t.Object({
  bobot: t.Optional(t.Numeric()),
});

export const getCplMataKuliahSchema = {
  detail: {
    tags: ['CPL Mata Kuliah'],
    summary: 'Daftar Mapping CPL ke Mata Kuliah',
    description: 'Mengambil semua mapping CPL ke Mata Kuliah.',
  },
  query: t.Object({
    cplId: t.Optional(t.Numeric()),
    mataKuliahId: t.Optional(t.Numeric()),
    kurikulumId: t.Optional(t.Numeric()),
  }),
};

export const createCplMataKuliahSchema = {
  detail: {
    tags: ['CPL Mata Kuliah'],
    summary: 'Tambah Mapping CPL ke Mata Kuliah',
    description: 'Menambahkan mapping CPL ke Mata Kuliah dengan bobot.',
  },
  body: cplMataKuliahBody,
};

export const updateCplMataKuliahSchema = {
  detail: {
    tags: ['CPL Mata Kuliah'],
    summary: 'Update Bobot Mapping CPL ke Mata Kuliah',
    description: 'Mengupdate bobot mapping CPL ke Mata Kuliah.',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
  body: cplMataKuliahUpdateBody,
};

export const deleteCplMataKuliahSchema = {
  detail: {
    tags: ['CPL Mata Kuliah'],
    summary: 'Hapus Mapping CPL ke Mata Kuliah',
    description: 'Menghapus mapping CPL ke Mata Kuliah berdasarkan ID.',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
};

export const getCplMataKuliahMatriksSchema = {
  detail: {
    tags: ['CPL Mata Kuliah'],
    summary: 'Matriks Bobot CPL ke Mata Kuliah',
    description: 'Mengambil matriks bobot CPL ke Mata Kuliah per kurikulum.',
  },
  query: t.Object({
    kurikulumId: t.Numeric(),
  }),
};

export const validateCplMataKuliahBobotSchema = {
  detail: {
    tags: ['CPL Mata Kuliah'],
    summary: 'Validasi Total Bobot CPL',
    description: 'Memvalidasi total bobot MK untuk satu CPL = 100%.',
  },
  query: t.Object({
    cplId: t.Numeric(),
  }),
};

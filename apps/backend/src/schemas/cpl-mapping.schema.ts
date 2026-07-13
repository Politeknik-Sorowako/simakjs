import { t } from 'elysia';

export const cplMappingBody = t.Object({
  cplId: t.Integer({ default: 1 }),
  profilLulusanId: t.Integer({ default: 1 }),
  bobot: t.Optional(t.Numeric()),
});

export const getCplMappingSchema = {
  detail: {
    tags: ['CPL Mapping'],
    summary: 'Daftar Mapping CPL ke Profil Lulusan',
    description: 'Mengambil semua mapping CPL ke Profil Lulusan, filter by prodi.',
  },
  query: t.Object({
    prodiId: t.Optional(t.Numeric()),
    cplId: t.Optional(t.Numeric()),
    profilLulusanId: t.Optional(t.Numeric()),
  }),
};

export const createCplMappingSchema = {
  detail: {
    tags: ['CPL Mapping'],
    summary: 'Tambah Mapping CPL ke Profil Lulusan',
    description: 'Menambahkan mapping CPL ke Profil Lulusan dengan bobot (Hanya Admin/Prodi).',
  },
  body: cplMappingBody,
};

export const deleteCplMappingSchema = {
  detail: {
    tags: ['CPL Mapping'],
    summary: 'Hapus Mapping CPL ke Profil Lulusan',
    description: 'Menghapus mapping CPL ke Profil Lulusan berdasarkan ID.',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
};

export const getCplMatriksSchema = {
  detail: {
    tags: ['CPL Mapping'],
    summary: 'Matriks Bobot CPL ke Profil Lulusan',
    description: 'Mengambil matriks bobot CPL ke Profil Lulusan per prodi dengan normalisasi otomatis.',
  },
  query: t.Object({
    prodiId: t.Numeric(),
  }),
};

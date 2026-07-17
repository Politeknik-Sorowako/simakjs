import { t } from 'elysia';

export const subCpmkBody = t.Object({
  cpmkId: t.Integer({ default: 1 }),
  kode: t.String({ default: 'SubCPMK-1.1' }),
  deskripsi: t.String({ default: 'Deskripsi SubCPMK' }),
  urutan: t.Optional(t.Integer({ default: 0 })),
});

export const getSubCpmkSchema = {
  detail: {
    tags: ['SubCPMK'],
    summary: 'Daftar SubCPMK',
    description: 'Mengambil semua data SubCPMK berdasarkan CPMK.',
  },
  query: t.Object({
    cpmkId: t.Numeric(),
  }),
};

export const getSubCpmkByIdSchema = {
  detail: {
    tags: ['SubCPMK'],
    summary: 'Detail SubCPMK',
    description: 'Mengambil satu data SubCPMK berdasarkan ID.',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
};

export const createSubCpmkSchema = {
  detail: {
    tags: ['SubCPMK'],
    summary: 'Tambah SubCPMK Baru',
    description: 'Menambahkan SubCPMK baru (Hanya Admin/Dosen/Prodi).',
  },
  body: subCpmkBody,
};

export const updateSubCpmkSchema = {
  detail: {
    tags: ['SubCPMK'],
    summary: 'Perbarui SubCPMK',
    description: 'Memperbarui data SubCPMK berdasarkan ID.',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
  body: t.Partial(subCpmkBody),
};

export const deleteSubCpmkSchema = {
  detail: {
    tags: ['SubCPMK'],
    summary: 'Hapus SubCPMK',
    description: 'Menghapus data SubCPMK berdasarkan ID.',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
};

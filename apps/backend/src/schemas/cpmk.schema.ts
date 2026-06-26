import { t } from 'elysia';

export const cpmkBody = t.Object({
  mataKuliahId: t.Integer({ default: 1 }),
  kode: t.String({ default: 'CPMK-1' }),
  deskripsi: t.String({ default: 'Mampu menerapkan konsep dasar pemrograman' }),
});

export const updateCpmkBody = t.Partial(t.Object({
  kode: t.String(),
  deskripsi: t.String(),
}));

export const createCpmkSchema = {
  detail: {
    tags: ['CPMK'],
    summary: 'Tambah CPMK Baru',
    description: 'Menambahkan CPMK baru untuk Mata Kuliah tertentu.'
  },
  body: cpmkBody,
};

export const getCpmkByMataKuliahSchema = {
  detail: {
    tags: ['CPMK'],
    summary: 'Daftar CPMK Mata Kuliah',
    description: 'Mengambil daftar CPMK berdasarkan ID Mata Kuliah.'
  },
  params: t.Object({
    mataKuliahId: t.Numeric()
  }),
};

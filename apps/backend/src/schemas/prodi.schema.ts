import { t } from 'elysia';

export const getProdiSchema = {
  detail: {
    tags: ['Program Studi'],
    summary: 'Daftar Program Studi',
    description: 'Mengambil semua data program studi yang terdaftar dengan pagination dan filter pencarian.'
  },
  query: t.Object({
    page: t.Optional(t.String({ default: '1' })),
    limit: t.Optional(t.String({ default: '10' })),
    search: t.Optional(t.String({ default: '' }))
  }),
  response: {
    200: t.Array(
      t.Object({
        id: t.Integer({ default: 1 }),
        kode: t.String({ default: 'TI' }),
        nama: t.String({ default: 'Teknik Informatika' }),
        jenjang: t.String({ default: 'D4' }),
        idPddikti: t.Union([t.String(), t.Null()], { default: null })
      })
    )
  }
};


export const createProdiSchema = {
  detail: {
    tags: ['Program Studi'],
    summary: 'Tambah Program Studi Baru',
    description: 'Menambahkan prodi baru (Hanya dapat diakses oleh Admin yang menyertakan token JWT).'
  },
  body: t.Object({
    kode: t.String({ default: 'TI' }),
    nama: t.String({ default: 'Teknik Informatika' }),
    jenjang: t.String({ default: 'D4' })
  }),
  response: {
    201: t.Object({
      id: t.Integer({ default: 1 }),
      kode: t.String({ default: 'TI' }),
      nama: t.String({ default: 'Teknik Informatika' }),
      jenjang: t.String({ default: 'D4' }),
      idPddikti: t.Union([t.String(), t.Null()], { default: null })
    }),
    403: t.Object({
      error: t.String({ default: 'Akses ditolak. Hanya Admin.' })
    })
  }
};

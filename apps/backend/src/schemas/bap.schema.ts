import { t } from 'elysia';

export const bapBody = t.Object({
  kelasKuliahId: t.Integer({ default: 1 }),
  tanggal: t.String({ default: '2026-06-27' }),
  pertemuanKe: t.Integer({ default: 1 }),
  materi: t.String({ default: 'Pengenalan dan Dasar Pemrograman' }),
  durasiMenit: t.Integer({ default: 100 }),
  cpmkId: t.Integer({ default: 1 }),
  dosenId: t.Integer({ default: 1 }),
});

export const createBapSchema = {
  detail: {
    tags: ['BAP'],
    summary: 'Tambah BAP Baru',
    description: 'Menambahkan BAP (Berita Acara Perkuliahan) baru beserta referensi CPMK.'
  },
  body: bapBody,
  response: {
    201: t.Object({
      id: t.Optional(t.Integer({ default: 1 })),
      kelasKuliahId: t.Optional(t.Integer({ default: 1 })),
      tanggal: t.Optional(t.String({ default: '2026-06-27' })),
      pertemuanKe: t.Optional(t.Integer({ default: 1 })),
      materi: t.Optional(t.String({ default: 'Pengenalan dan Dasar Pemrograman' })),
      durasiMenit: t.Optional(t.Integer({ default: 100 })),
      cpmkId: t.Optional(t.Union([t.Integer(), t.Null()], { default: 1 })),
      dosenId: t.Optional(t.Integer({ default: 1 })),
    })
  }
};

export const getBapByKelasSchema = {
  detail: {
    tags: ['BAP'],
    summary: 'Daftar BAP per Kelas',
    description: 'Mengambil daftar BAP untuk suatu kelas kuliah.'
  },
  params: t.Object({
    kelasKuliahId: t.Numeric()
  }),
  response: {
    200: t.Array(t.Object({
      id: t.Optional(t.Integer({ default: 1 })),
      kelasKuliahId: t.Optional(t.Integer({ default: 1 })),
      tanggal: t.Optional(t.String({ default: '2026-06-27' })),
      pertemuanKe: t.Optional(t.Integer({ default: 1 })),
      materi: t.Optional(t.String({ default: 'Pengenalan dan Dasar Pemrograman' })),
      durasiMenit: t.Optional(t.Integer({ default: 100 })),
      cpmkId: t.Optional(t.Union([t.Integer(), t.Null()], { default: 1 })),
      dosenId: t.Optional(t.Integer({ default: 1 })),
    }))
  }
};
export const getRpsTopikByKelasSchema = {
  detail: {
    tags: ['BAP'],
    summary: 'Daftar Topik RPS per Kelas',
    description: 'Mengambil daftar topik RPS untuk kelas kuliah tertentu.'
  },
  params: t.Object({
    kelasKuliahId: t.Numeric()
  }),
  response: {
    200: t.Array(t.Object({
      id: t.Integer({ default: 1 }),
      rpsId: t.Integer({ default: 1 }),
      pertemuanKe: t.Integer({ default: 1 }),
      topik: t.String({ default: 'Pengenalan HTML' }),
      subTopik: t.Union([t.String(), t.Null()]),
      metode: t.Union([t.String(), t.Null()]),
      cpmkId: t.Union([t.Integer(), t.Null()]),
    }))
  }
};

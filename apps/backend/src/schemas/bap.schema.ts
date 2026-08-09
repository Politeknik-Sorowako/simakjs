import { t } from 'elysia';

export const bapBody = t.Object({
  kelasKuliahId: t.Integer({ default: 1 }),
  tanggal: t.String({ default: '2026-06-27' }),
  pertemuanKe: t.Integer({ default: 1 }),
  tema: t.Optional(t.Nullable(t.String())),
  materi: t.String({ default: 'Pengenalan dan Dasar Pemrograman' }),
  catatan: t.Optional(t.Nullable(t.String())),
  durasiMenit: t.Integer({ default: 100 }),
  cpmkId: t.Optional(t.Union([t.Integer(), t.Null()], { default: 1 })),
  topikIds: t.Optional(t.Array(t.Integer())),
  dosenId: t.Integer({ default: 1 }),
  sesiIds: t.Optional(t.Array(t.Integer())),
});

export const createBapSchema = {
  detail: {
    tags: ['BAP'],
    summary: 'Tambah BAP Baru',
    description: 'Menambahkan BAP (Berita Acara Perkuliahan) baru beserta referensi CPMK.',
  },
  body: bapBody,
  response: {
    201: t.Object({
      id: t.Optional(t.Integer({ default: 1 })),
      kelasKuliahId: t.Optional(t.Integer({ default: 1 })),
      tanggal: t.Optional(t.String({ default: '2026-06-27' })),
      pertemuanKe: t.Optional(t.Integer({ default: 1 })),
      materi: t.Optional(t.String({ default: 'Pengenalan dan Dasar Pemrograman' })),
      catatan: t.Optional(t.Nullable(t.String())),
      durasiMenit: t.Optional(t.Integer({ default: 100 })),
      cpmkId: t.Optional(t.Union([t.Integer(), t.Null()], { default: 1 })),
      topikIds: t.Optional(t.Array(t.Integer())),
      dosenId: t.Optional(t.Integer({ default: 1 })),
    }),
  },
};

export const getBapByKelasSchema = {
  detail: {
    tags: ['BAP'],
    summary: 'Daftar BAP per Kelas',
    description: 'Mengambil daftar BAP untuk suatu kelas kuliah.',
  },
  params: t.Object({
    kelasKuliahId: t.Numeric(),
  }),
  response: {
    200: t.Array(
      t.Object({
        id: t.Optional(t.Integer({ default: 1 })),
        kelasKuliahId: t.Optional(t.Integer({ default: 1 })),
        tanggal: t.Optional(t.String({ default: '2026-06-27' })),
        pertemuanKe: t.Optional(t.Integer({ default: 1 })),
        materi: t.Optional(t.String({ default: 'Pengenalan dan Dasar Pemrograman' })),
        catatan: t.Optional(t.Nullable(t.String())),
        durasiMenit: t.Optional(t.Integer({ default: 100 })),
        cpmkId: t.Optional(t.Union([t.Integer(), t.Null()], { default: 1 })),
        topikIds: t.Optional(t.Array(t.Integer())),
        dosenId: t.Optional(t.Integer({ default: 1 })),
      }),
    ),
  },
};
export const getRpsTopikByKelasSchema = {
  detail: {
    tags: ['BAP'],
    summary: 'Daftar Topik RPS per Kelas',
    description: 'Mengambil daftar topik RPS untuk kelas kuliah tertentu.',
  },
  params: t.Object({
    kelasKuliahId: t.Numeric(),
  }),
  response: {
    200: t.Array(
      t.Object({
        id: t.Integer({ default: 1 }),
        rpsId: t.Integer({ default: 1 }),
        pertemuanKe: t.Integer({ default: 1 }),
        topik: t.String({ default: 'Pengenalan HTML' }),
        subTopik: t.Union([t.String(), t.Null()]),
        metode: t.Union([t.String(), t.Null()]),
        cpmkId: t.Union([t.Integer(), t.Null()]),
      }),
    ),
  },
};

export const updateBapSchema = {
  detail: {
    tags: ['BAP'],
    summary: 'Perbarui BAP',
    description: 'Memperbarui data BAP (Berita Acara Perkuliahan) berdasarkan ID.',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
  body: t.Partial(
    t.Object({
      tanggal: t.Optional(t.String()),
      pertemuanKe: t.Optional(t.Integer()),
      tema: t.Optional(t.Nullable(t.String())),
      materi: t.Optional(t.String()),
      catatan: t.Optional(t.Nullable(t.String())),
      durasiMenit: t.Optional(t.Integer()),
      cpmkId: t.Optional(t.Integer()),
      topikIds: t.Optional(t.Array(t.Integer())),
      dosenId: t.Optional(t.Integer()),
    }),
  ),
};

export const getMonitoringRpsSchema = {
  detail: {
    tags: ['BAP'],
    summary: 'Monitoring Kesesuaian RPS',
    description: 'Mengambil statistik rekap kesesuaian materi BAP terhadap RPS per kelas kuliah.',
  },
  query: t.Object({
    periodeId: t.Optional(t.Union([t.String({ minLength: 1, maxLength: 10 }), t.Numeric()])),
    prodiId: t.Optional(t.Numeric()),
  }),
};

export const getMonitoringRpsDetailSchema = {
  detail: {
    tags: ['BAP'],
    summary: 'Detail Monitoring Kesesuaian RPS per Kelas',
    description: 'Mengambil matriks rincian topik RPS vs realisasi BAP untuk satu kelas kuliah.',
  },
  params: t.Object({
    kelasKuliahId: t.Numeric(),
  }),
};

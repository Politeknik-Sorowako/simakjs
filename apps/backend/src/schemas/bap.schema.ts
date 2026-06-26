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
};

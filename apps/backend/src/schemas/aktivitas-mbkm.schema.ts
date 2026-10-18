import { t } from 'elysia';

const aktivitasTags = ['Aktivitas MBKM'];
const statusAktivitas = t.Union([
  t.Literal('draft'),
  t.Literal('diajukan'),
  t.Literal('disetujui'),
  t.Literal('ditolak'),
  t.Literal('selesai'),
]);

export const getJenisAktivitasSchema = {
  detail: {
    tags: aktivitasTags,
    summary: 'Daftar jenis aktivitas MBKM',
  },
};

export const getAktivitasSchema = {
  detail: {
    tags: aktivitasTags,
    summary: 'Daftar aktivitas MBKM',
    description:
      'Menampilkan aktivitas beserta jumlah anggota, pembimbing, dan SKS konversi. Mahasiswa hanya melihat kegiatannya sendiri; dosen melihat yang ia pembimbingi.',
  },
  query: t.Object({
    status: t.Optional(statusAktivitas),
    programStudiId: t.Optional(t.Numeric()),
    periodeId: t.Optional(t.String({ maxLength: 5 })),
    jenisId: t.Optional(t.Numeric()),
    search: t.Optional(t.String({ maxLength: 100 })),
    page: t.Optional(t.Numeric({ minimum: 1 })),
    limit: t.Optional(t.Numeric({ minimum: 1, maximum: 200 })),
  }),
};

export const getAktivitasByIdSchema = {
  detail: { tags: aktivitasTags, summary: 'Detail aktivitas MBKM' },
  params: t.Object({ id: t.Numeric() }),
};

const aktivitasBody = {
  judul: t.String({ minLength: 3, maxLength: 255 }),
  jenisId: t.Integer({ minimum: 1 }),
  periodeId: t.Optional(t.Union([t.String({ maxLength: 5 }), t.Null()])),
  programStudiId: t.Optional(t.Union([t.Integer(), t.Null()])),
  lokasi: t.Optional(t.Union([t.String({ maxLength: 255 }), t.Null()])),
  institusi: t.Optional(t.Union([t.String({ maxLength: 255 }), t.Null()])),
  tanggalMulai: t.Optional(t.Union([t.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}$' }), t.Null()])),
  tanggalSelesai: t.Optional(t.Union([t.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}$' }), t.Null()])),
  sks: t.Optional(t.Integer({ minimum: 0, maximum: 60 })),
  deskripsi: t.Optional(t.Union([t.String(), t.Null()])),
};

export const createAktivitasSchema = {
  detail: { tags: aktivitasTags, summary: 'Buat aktivitas MBKM (draft)' },
  body: t.Object(aktivitasBody),
};

export const updateAktivitasSchema = {
  detail: { tags: aktivitasTags, summary: 'Ubah aktivitas MBKM (hanya draft)' },
  params: t.Object({ id: t.Numeric() }),
  body: t.Object(aktivitasBody),
};

export const aktivitasIdSchema = {
  detail: { tags: aktivitasTags, summary: 'Aksi pada aktivitas MBKM' },
  params: t.Object({ id: t.Numeric() }),
};

export const addAnggotaSchema = {
  detail: { tags: aktivitasTags, summary: 'Tambah anggota mahasiswa' },
  params: t.Object({ id: t.Numeric() }),
  body: t.Object({
    mahasiswaId: t.Integer({ minimum: 1 }),
    peran: t.Optional(t.Union([t.Literal('ketua'), t.Literal('anggota')])),
  }),
};

export const removeAnggotaSchema = {
  detail: { tags: aktivitasTags, summary: 'Hapus anggota dari aktivitas' },
  params: t.Object({ id: t.Numeric(), anggotaId: t.Numeric() }),
};

export const addPembimbingSchema = {
  detail: { tags: aktivitasTags, summary: 'Tambah dosen pembimbing' },
  params: t.Object({ id: t.Numeric() }),
  body: t.Object({
    dosenId: t.Integer({ minimum: 1 }),
    kategori: t.Optional(t.Union([t.Literal('pembimbing'), t.Literal('pendamping')])),
  }),
};

export const removePembimbingSchema = {
  detail: { tags: aktivitasTags, summary: 'Hapus pembimbing dari aktivitas' },
  params: t.Object({ id: t.Numeric(), pembimbingId: t.Numeric() }),
};

export const addKonversiSchema = {
  detail: {
    tags: aktivitasTags,
    summary: 'Tambah rekognisi SKS ke mata kuliah',
    description: 'Total SKS diakui untuk satu aktivitas tidak boleh melebihi SKS aktivitas.',
  },
  params: t.Object({ id: t.Numeric() }),
  body: t.Object({
    mataKuliahId: t.Integer({ minimum: 1 }),
    sksDiakui: t.Integer({ minimum: 1, maximum: 24 }),
  }),
};

export const removeKonversiSchema = {
  detail: { tags: aktivitasTags, summary: 'Hapus rekognisi SKS' },
  params: t.Object({ id: t.Numeric(), konversiId: t.Numeric() }),
};

/**
 * Override status di luar alur normal. Alasan WAJIB diisi karena audit log
 * otomatis hanya menyimpan URL dan pelaku — alasan koreksi hanya terekam di
 * sini, dan tercatat permanen pada `aktivitas_mbkm_status_log`.
 */
export const overrideStatusSchema = {
  detail: {
    tags: aktivitasTags,
    summary: 'Override status aktivitas MBKM',
    description:
      'Paksa perpindahan status ke nilai mana pun untuk koreksi data. Setiap override wajib menyertakan alasan yang disimpan permanen pada riwayat status.',
  },
  params: t.Object({ id: t.Numeric() }),
  body: t.Object({
    status: statusAktivitas,
    alasan: t.String({ minLength: 10, maxLength: 500 }),
  }),
};

export const statusLogSchema = {
  detail: { tags: aktivitasTags, summary: 'Riwayat perubahan status aktivitas MBKM' },
  params: t.Object({ id: t.Numeric() }),
};

import { t } from 'elysia';

const riwayatQuery = t.Object({
  page: t.Optional(t.String({ default: '1' })),
  limit: t.Optional(t.String({ default: '20' })),
  search: t.Optional(t.String()),
  prodiId: t.Optional(t.String()),
  tglDari: t.Optional(t.String()),
  tglSampai: t.Optional(t.String()),
  sortBy: t.Optional(t.String()),
  sortOrder: t.Optional(t.String()),
  sumber: t.Optional(t.String()),
});

const riwayatRow = t.Object({
  id: t.Integer(),
  mahasiswaId: t.Integer(),
  nim: t.String(),
  nama: t.String(),
  foto: t.Optional(t.Union([t.String(), t.Null()])),
  prodiId: t.Optional(t.Union([t.Integer(), t.Null()])),
  prodiNama: t.Optional(t.Union([t.String(), t.Null()])),
  tanggal: t.String(),
  sumber: t.String(),
  sumberId: t.Optional(t.Union([t.Integer(), t.Null()])),
  status: t.String(),
  durasiMenit: t.Integer(),
  keterangan: t.Optional(t.Union([t.String(), t.Null()])),
  isVerified: t.Boolean(),
  verifiedBy: t.Optional(t.Union([t.Integer(), t.Null()])),
  verifiedByName: t.Optional(t.Union([t.String(), t.Null()])),
  verifiedAt: t.Optional(t.Union([t.Date(), t.Null()])),
  sumberLabel: t.Optional(t.String()),
  pertemuanKe: t.Optional(t.Union([t.Integer(), t.Null()])),
  materi: t.Optional(t.Union([t.String(), t.Null()])),
  lampiranEvidens: t.Optional(t.Union([t.String(), t.Null()])),
  kelasKuliahId: t.Optional(t.Union([t.Integer(), t.Null()])),
  bapId: t.Optional(t.Union([t.Integer(), t.Null()])),
  bapPraktikumId: t.Optional(t.Union([t.Integer(), t.Null()])),
  rombelPraktikumId: t.Optional(t.Union([t.Integer(), t.Null()])),
  namaGroup: t.Optional(t.Union([t.String(), t.Null()])),
  sesiApelId: t.Optional(t.Union([t.Integer(), t.Null()])),
  kelompokApelId: t.Optional(t.Union([t.Integer(), t.Null()])),
  tanggalSesiApel: t.Optional(t.Union([t.String(), t.Null()])),
  namaKelas: t.Optional(t.Union([t.String(), t.Null()])),
  mataKuliahKode: t.Optional(t.Union([t.String(), t.Null()])),
  mataKuliahNama: t.Optional(t.Union([t.String(), t.Null()])),
  dosenNama: t.Optional(t.Union([t.String(), t.Null()])),
  kelompokNama: t.Optional(t.Union([t.String(), t.Null()])),
  shift: t.Optional(t.Union([t.String(), t.Null()])),
  verificationNote: t.Optional(t.Union([t.String(), t.Null()])),
  kompensasiManualId: t.Optional(t.Union([t.Integer(), t.Null()])),
  createdBy: t.Optional(t.Union([t.Integer(), t.Null()])),
  createdByName: t.Optional(t.Union([t.String(), t.Null()])),
});

const meta = t.Object({
  total: t.Integer(),
  page: t.Integer(),
  limit: t.Integer(),
  totalPages: t.Integer(),
});

export const riwayatQueryWithStatus = t.Object({
  page: t.Optional(t.String({ default: '1' })),
  limit: t.Optional(t.String({ default: '20' })),
  search: t.Optional(t.String()),
  prodiId: t.Optional(t.String()),
  tglDari: t.Optional(t.String()),
  tglSampai: t.Optional(t.String()),
  sortBy: t.Optional(t.String()),
  sortOrder: t.Optional(t.String()),
  sumber: t.Optional(t.String()),
  statusVerif: t.Optional(t.Union([t.Literal('belum'), t.Literal('sudah')])),
});

export const getRiwayatKetidakhadiranSchema = {
  detail: {
    tags: ['Ketidakhadiran'],
    summary: 'Riwayat Ketidakhadiran Terpadu',
    description: 'Daftar ketidakhadiran terpadu (BAP/Apel/Praktikum/Manual) dengan filter, sorting, dan pagination.',
  },
  query: riwayatQueryWithStatus,
  response: {
    200: t.Object({
      data: t.Array(riwayatRow),
      meta,
    }),
    400: t.Object({ error: t.String() }),
    403: t.Object({ error: t.String() }),
  },
};

export const getRekamanSchema = {
  detail: {
    tags: ['Kompensasi'],
    summary: 'Rekaman Kompensasi Terpadu',
    description: 'Daftar rekaman kompensasi mahasiswa (terverifikasi + manual) dengan filter, sorting, dan pagination.',
  },
  query: riwayatQuery,
  response: {
    200: t.Object({
      data: t.Array(riwayatRow),
      meta,
    }),
    400: t.Object({ error: t.String() }),
    403: t.Object({ error: t.String() }),
  },
};

export const bulkAnulirSchema = {
  detail: {
    tags: ['Kompensasi'],
    summary: 'Anulir Massal Ketidakhadiran',
    description: 'Menganulir (durasi 0) beberapa catatan ketidakhadiran terverifikasi non-manual sekaligus.',
  },
  body: t.Object({
    ids: t.Array(t.Number()),
  }),
  response: {
    200: t.Object({
      success: t.Boolean(),
      anulir: t.Integer(),
      manualDeleted: t.Integer(),
    }),
    400: t.Object({ error: t.String() }),
    403: t.Object({ error: t.String() }),
  },
};

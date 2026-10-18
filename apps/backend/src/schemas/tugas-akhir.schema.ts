import { t } from 'elysia';

export const usulanPembimbingItem = t.Object({
  peran: t.Union([t.Literal('pembimbing_1'), t.Literal('pembimbing_2')]),
  dosenId: t.Optional(t.Integer()),
  namaEksternal: t.Optional(t.String({ maxLength: 100 })),
  instansiEksternal: t.Optional(t.String({ maxLength: 255 })),
  catatan: t.Optional(t.String()),
});

export const createTugasAkhirBody = t.Object({
  judul: t.String({ minLength: 5, maxLength: 500 }),
  judulInggris: t.Optional(t.String({ maxLength: 500 })),
  tipe: t.Union([t.Literal('individu'), t.Literal('kelompok')], { default: 'individu' }),
  jenisKarya: t.Union(
    [t.Literal('skripsi'), t.Literal('prototipe'), t.Literal('proyek_rekayasa'), t.Literal('rancang_bangun')],
    { default: 'skripsi' },
  ),
  bidangKajian: t.Optional(t.String({ maxLength: 100 })),
  latarBelakang: t.Optional(t.String()),
  rumusanMasalah: t.Optional(t.String()),
  tujuan: t.Optional(t.String()),
  metodologi: t.Optional(t.String()),
  mitraIndustri: t.Optional(t.String({ maxLength: 255 })),
  programStudiId: t.Integer(),
  periodeId: t.Optional(t.String({ maxLength: 5 })),
  fileProposalTopikUrl: t.Optional(t.String()),
  anggotaMahasiswaIds: t.Optional(t.Array(t.Integer())),
  usulanPembimbing: t.Optional(t.Array(usulanPembimbingItem)),
});

export const updateTugasAkhirBody = t.Object({
  judul: t.Optional(t.String({ minLength: 5, maxLength: 500 })),
  judulInggris: t.Optional(t.String({ maxLength: 500 })),
  tipe: t.Optional(t.Union([t.Literal('individu'), t.Literal('kelompok')])),
  jenisKarya: t.Optional(
    t.Union([t.Literal('skripsi'), t.Literal('prototipe'), t.Literal('proyek_rekayasa'), t.Literal('rancang_bangun')]),
  ),
  bidangKajian: t.Optional(t.String({ maxLength: 100 })),
  latarBelakang: t.Optional(t.String()),
  rumusanMasalah: t.Optional(t.String()),
  tujuan: t.Optional(t.String()),
  metodologi: t.Optional(t.String()),
  mitraIndustri: t.Optional(t.String({ maxLength: 255 })),
  fileProposalTopikUrl: t.Optional(t.String()),
});

export const reviewTopikBody = t.Object({
  status: t.Union([t.Literal('disetujui'), t.Literal('ditolak'), t.Literal('revisi_proposal_topik')]),
  catatanProdi: t.Optional(t.String()),
  pembimbing: t.Optional(t.Array(usulanPembimbingItem)),
});

export const overrideStatusBody = t.Object({
  keStatus: t.String({ minLength: 2, maxLength: 40 }),
  alasan: t.String({ minLength: 3, maxLength: 1000 }),
});

export const tugasAkhirIdParam = t.Object({
  id: t.Numeric(),
});

export const getTugasAkhirQuery = t.Object({
  page: t.Optional(t.String()),
  limit: t.Optional(t.String()),
  search: t.Optional(t.String()),
  status: t.Optional(t.String()),
  programStudiId: t.Optional(t.String()),
  periodeId: t.Optional(t.String()),
  tipe: t.Optional(t.String()),
  dosenId: t.Optional(t.String()),
});

export const tambahAnggotaBody = t.Object({
  mahasiswaId: t.Integer(),
  bagianPengerjaan: t.Optional(t.String()),
});

export const responUndanganBody = t.Object({
  statusKonfirmasi: t.Union([t.Literal('diterima'), t.Literal('ditolak')]),
});

export const createTugasAkhirSchema = {
  body: createTugasAkhirBody,
};

export const updateTugasAkhirSchema = {
  params: tugasAkhirIdParam,
  body: updateTugasAkhirBody,
};

export const reviewTopikSchema = {
  params: tugasAkhirIdParam,
  body: reviewTopikBody,
};

export const overrideStatusSchema = {
  params: tugasAkhirIdParam,
  body: overrideStatusBody,
};

export const tugasAkhirIdSchema = {
  params: tugasAkhirIdParam,
};

export const getTugasAkhirSchema = {
  query: getTugasAkhirQuery,
};

export const tambahAnggotaSchema = {
  params: tugasAkhirIdParam,
  body: tambahAnggotaBody,
};

export const responUndanganSchema = {
  params: tugasAkhirIdParam,
  body: responUndanganBody,
};

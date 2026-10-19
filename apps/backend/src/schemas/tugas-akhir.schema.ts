import { t } from 'elysia';

export const usulanPembimbingItem = t.Object({
  peran: t.Union([t.Literal('pembimbing_1'), t.Literal('pembimbing_2')]),
  dosenId: t.Optional(t.Union([t.Integer(), t.Null()])),
  namaEksternal: t.Optional(t.Union([t.String({ maxLength: 100 }), t.Null()])),
  instansiEksternal: t.Optional(t.Union([t.String({ maxLength: 255 }), t.Null()])),
  catatan: t.Optional(t.Union([t.String(), t.Null()])),
});

export const createTugasAkhirBody = t.Object({
  judul: t.String({ minLength: 3, maxLength: 500 }),
  judulInggris: t.Optional(t.Union([t.String({ maxLength: 500 }), t.Null()])),
  tipe: t.Union([t.Literal('individu'), t.Literal('kelompok')], { default: 'individu' }),
  jenisKarya: t.Union(
    [t.Literal('skripsi'), t.Literal('prototipe'), t.Literal('proyek_rekayasa'), t.Literal('rancang_bangun')],
    { default: 'skripsi' },
  ),
  bidangKajian: t.Optional(t.Union([t.String({ maxLength: 100 }), t.Null()])),
  latarBelakang: t.Optional(t.Union([t.String(), t.Null()])),
  rumusanMasalah: t.Optional(t.Union([t.String(), t.Null()])),
  tujuan: t.Optional(t.Union([t.String(), t.Null()])),
  metodologi: t.Optional(t.Union([t.String(), t.Null()])),
  mitraIndustri: t.Optional(t.Union([t.String({ maxLength: 255 }), t.Null()])),
  programStudiId: t.Optional(t.Union([t.Integer(), t.Null()])),
  periodeId: t.Optional(t.Union([t.String({ maxLength: 5 }), t.Null()])),
  fileProposalTopikUrl: t.Optional(t.Union([t.String(), t.Null()])),
  mahasiswaId: t.Optional(t.Union([t.Integer(), t.Null()])),
  anggotaMahasiswaIds: t.Optional(t.Union([t.Array(t.Integer()), t.Null()])),
  usulanPembimbing: t.Optional(t.Union([t.Array(usulanPembimbingItem), t.Null()])),
});

export const updateTugasAkhirBody = t.Object({
  judul: t.Optional(t.Union([t.String({ minLength: 3, maxLength: 500 }), t.Null()])),
  judulInggris: t.Optional(t.Union([t.String({ maxLength: 500 }), t.Null()])),
  tipe: t.Optional(t.Union([t.Literal('individu'), t.Literal('kelompok')])),
  jenisKarya: t.Optional(
    t.Union([t.Literal('skripsi'), t.Literal('prototipe'), t.Literal('proyek_rekayasa'), t.Literal('rancang_bangun')]),
  ),
  bidangKajian: t.Optional(t.Union([t.String({ maxLength: 100 }), t.Null()])),
  latarBelakang: t.Optional(t.Union([t.String(), t.Null()])),
  rumusanMasalah: t.Optional(t.Union([t.String(), t.Null()])),
  tujuan: t.Optional(t.Union([t.String(), t.Null()])),
  metodologi: t.Optional(t.Union([t.String(), t.Null()])),
  mitraIndustri: t.Optional(t.Union([t.String({ maxLength: 255 }), t.Null()])),
  fileProposalTopikUrl: t.Optional(t.Union([t.String(), t.Null()])),
  mahasiswaId: t.Optional(t.Union([t.Integer(), t.Null()])),
  anggotaMahasiswaIds: t.Optional(t.Union([t.Array(t.Integer()), t.Null()])),
  programStudiId: t.Optional(t.Union([t.Integer(), t.Null()])),
  usulanPembimbing: t.Optional(t.Union([t.Array(usulanPembimbingItem), t.Null()])),
});

export const reviewTopikBody = t.Object({
  status: t.Union([t.Literal('disetujui'), t.Literal('ditolak'), t.Literal('revisi_proposal_topik')]),
  catatanProdi: t.Optional(t.Union([t.String(), t.Null()])),
  pembimbing: t.Optional(t.Union([t.Array(usulanPembimbingItem), t.Null()])),
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
  bagianPengerjaan: t.Optional(t.Union([t.String(), t.Null()])),
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

export const createLogbookBody = t.Object({
  dosenId: t.Optional(t.Union([t.Integer(), t.Null()])),
  pertemuanKe: t.Integer({ minimum: 1, maximum: 50 }),
  tanggalBimbingan: t.String({ minLength: 10, maxLength: 10 }), // YYYY-MM-DD
  topik: t.String({ minLength: 3, maxLength: 500 }),
  deskripsiKemajuan: t.String({ minLength: 5 }),
  kendala: t.Optional(t.Union([t.String(), t.Null()])),
  fileDraftUrl: t.Optional(t.Union([t.String(), t.Null()])),
});

export const updateLogbookBody = t.Object({
  dosenId: t.Optional(t.Union([t.Integer(), t.Null()])),
  pertemuanKe: t.Optional(t.Integer({ minimum: 1, maximum: 50 })),
  tanggalBimbingan: t.Optional(t.String({ minLength: 10, maxLength: 10 })),
  topik: t.Optional(t.String({ minLength: 3, maxLength: 500 })),
  deskripsiKemajuan: t.Optional(t.String({ minLength: 5 })),
  kendala: t.Optional(t.Union([t.String(), t.Null()])),
  fileDraftUrl: t.Optional(t.Union([t.String(), t.Null()])),
});

export const reviewLogbookBody = t.Object({
  statusBimbingan: t.Union([t.Literal('disetujui'), t.Literal('perlu_revisi'), t.Literal('menunggu')]),
  catatanDosen: t.Optional(t.Union([t.String(), t.Null()])),
  fileRevisiUrl: t.Optional(t.Union([t.String(), t.Null()])),
});

export const accSidangBody = t.Object({
  jenisSidang: t.Union([t.Literal('proposal'), t.Literal('akhir')]),
  statusAcc: t.Boolean(),
  catatan: t.Optional(t.Union([t.String(), t.Null()])),
});

export const logbookIdParam = t.Object({
  id: t.Numeric(),
  logbookId: t.Numeric(),
});

export const createLogbookSchema = {
  params: tugasAkhirIdParam,
  body: createLogbookBody,
};

export const updateLogbookSchema = {
  params: logbookIdParam,
  body: updateLogbookBody,
};

export const reviewLogbookSchema = {
  params: logbookIdParam,
  body: reviewLogbookBody,
};

export const deleteLogbookSchema = {
  params: logbookIdParam,
};

export const accSidangSchema = {
  params: tugasAkhirIdParam,
  body: accSidangBody,
};

// Milestone 3: Sidang Proposal & Sidang Akhir Schemas
export const daftarSidangBody = t.Object({
  jenisSidang: t.Union([t.Literal('proposal'), t.Literal('kemajuan'), t.Literal('akhir')], { default: 'proposal' }),
  berkasProposalUrl: t.Optional(t.Union([t.String(), t.Null()])),
  buktiBebasKompensasiUrl: t.Optional(t.Union([t.String(), t.Null()])),
  buktiPlagiasiUrl: t.Optional(t.Union([t.String(), t.Null()])),
  catatanMahasiswa: t.Optional(t.Union([t.String(), t.Null()])),
});

export const pengujiPlottingItem = t.Object({
  dosenId: t.Integer(),
  peranPenguji: t.Union([
    t.Literal('ketua_penguji'),
    t.Literal('sekretaris'),
    t.Literal('penguji_1'),
    t.Literal('penguji_2'),
    t.Literal('pembimbing_1'),
    t.Literal('pembimbing_2'),
  ]),
});

export const jadwalSidangBody = t.Object({
  tanggalSidang: t.String({ minLength: 10, maxLength: 10 }), // YYYY-MM-DD
  jamMulai: t.String({ minLength: 4, maxLength: 10 }), // e.g. "09:00"
  jamSelesai: t.String({ minLength: 4, maxLength: 10 }), // e.g. "11:00"
  ruangan: t.String({ minLength: 2, maxLength: 100 }),
  timPenguji: t.Array(pengujiPlottingItem, { minItems: 1 }),
});

export const nilaiItemSchema = t.Object({
  kriteriaId: t.Integer(),
  mahasiswaId: t.Integer(),
  nilai: t.Numeric({ minimum: 0, maximum: 10 }),
});

export const inputNilaiSidangBody = t.Object({
  nilaiList: t.Array(nilaiItemSchema, { minItems: 1 }),
  catatanRevisi: t.Optional(t.Union([t.String(), t.Null()])),
});

export const finalisasiSidangBody = t.Object({
  statusHasil: t.Union([
    t.Literal('lulus_tanpa_revisi'),
    t.Literal('lulus_dengan_revisi'),
    t.Literal('sidang_ulang'),
    t.Literal('tidak_lulus'),
  ]),
  batasWaktuRevisi: t.Optional(t.Union([t.String({ minLength: 10, maxLength: 10 }), t.Null()])),
  catatanSidang: t.Optional(t.Union([t.String(), t.Null()])),
});

export const sidangIdParam = t.Object({
  id: t.Numeric(),
  sidangId: t.Numeric(),
});

export const daftarSidangSchema = {
  params: tugasAkhirIdParam,
  body: daftarSidangBody,
};

export const jadwalSidangSchema = {
  params: sidangIdParam,
  body: jadwalSidangBody,
};

export const inputNilaiSidangSchema = {
  params: sidangIdParam,
  body: inputNilaiSidangBody,
};

export const finalisasiSidangSchema = {
  params: sidangIdParam,
  body: finalisasiSidangBody,
};

export const sidangIdSchema = {
  params: sidangIdParam,
};

// Milestone 4: Schemas untuk Revisi Pasca Sidang
export const submitRevisiSidangBody = t.Object({
  fileRevisiUrl: t.String({ minLength: 3 }),
  catatanMahasiswa: t.Optional(t.Union([t.String(), t.Null()])),
});

export const submitRevisiSidangSchema = {
  params: sidangIdParam,
  body: submitRevisiSidangBody,
};

export const accRevisiParam = t.Object({
  id: t.Numeric(),
  sidangId: t.Numeric(),
  pengujiId: t.Numeric(),
});

export const accRevisiSchema = {
  params: accRevisiParam,
};

import { t } from 'elysia';

export const pelanggaranBody = t.Object({
  mahasiswaId: t.Integer({ default: 1 }),
  tanggal: t.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}$', default: '2026-06-27' }),
  jenisPelanggaran: t.Optional(t.String({ minLength: 3, maxLength: 255 })),
  keterangan: t.String({ minLength: 3, maxLength: 1000, default: 'Terlambat lebih dari 30 menit tanpa alasan sah.' }),
  pasalId: t.Optional(t.Union([t.Integer(), t.Null()])),
  jenisSanksi: t.Optional(t.Integer({ minimum: 1, maximum: 4, default: 1 })),
  pelapor: t.Optional(t.Union([t.String({ maxLength: 255 }), t.Null()])),
});

// Bentuk return tunggal (create & update) dari `.returning()` Drizzle.
export const pelanggaranResponse = t.Object({
  id: t.Integer(),
  mahasiswaId: t.Integer(),
  tanggal: t.String(),
  jenisPelanggaran: t.String(),
  keterangan: t.String(),
  pasalId: t.Union([t.Integer(), t.Null()]),
  jenisSanksi: t.Integer(),
  pelapor: t.Union([t.String(), t.Null()]),
  dibuatOleh: t.Union([t.Integer(), t.Null()]),
  createdAt: t.Date(),
  updatedAt: t.Date(),
});

export const createPelanggaranSchema = {
  detail: {
    tags: ['Kedisiplinan'],
    summary: 'Catat Tindakan Indisipliner',
    description:
      'Admin/Dosen/Instruktur mencatat tindakan indisipliner mahasiswa. Pilih pasal BPA, bobot poin otomatis mengikuti jenis sanksi (Lisan=1 / Tertulis=4).',
  },
  body: pelanggaranBody,
  response: {
    201: pelanggaranResponse,
    400: t.Object({ error: t.String() }),
    403: t.Object({ error: t.String() }),
  },
};

export const getPelanggaranMahasiswaSchema = {
  detail: {
    tags: ['Kedisiplinan'],
    summary: 'Riwayat Pelanggaran Mahasiswa',
    description: 'Mengambil daftar riwayat tindakan indisipliner beserta akumulasi poin dan predikat TXLY.',
  },
  params: t.Object({
    mhsId: t.Numeric(),
  }),
  response: {
    200: t.Object({
      totalPoin: t.Integer(),
      predikat: t.String(),
      degradasiNilaiSikap: t.Number(),
      pelanggaranList: t.Array(
        t.Object({
          id: t.Integer(),
          mahasiswaId: t.Integer(),
          nim: t.String(),
          namaMahasiswa: t.String(),
          prodiNama: t.Union([t.String(), t.Null()]),
          programStudiId: t.Union([t.Integer(), t.Null()]),
          jenjang: t.Union([t.String(), t.Null()]),
          dosenPaId: t.Union([t.Integer(), t.Null()]),
          tanggal: t.String(),
          jenisPelanggaran: t.String(),
          bobotPoin: t.Integer(),
          keterangan: t.String(),
          pasalId: t.Union([t.Integer(), t.Null()]),
          jenisSanksi: t.Integer(),
          nomorPasal: t.Union([t.String(), t.Null()]),
          bunyiPasal: t.Union([t.String(), t.Null()]),
          pelapor: t.Union([t.String(), t.Null()]),
          createdAt: t.Date(),
        }),
      ),
    }),
    400: t.Object({ error: t.String() }),
    403: t.Object({ error: t.String() }),
  },
};

export const getAllPelanggaranSchema = {
  detail: {
    tags: ['Kedisiplinan'],
    summary: 'Daftar Semua Pelanggaran',
    description: 'Mengambil semua data pelanggaran mahasiswa untuk keperluan rekap BAAK/Kaprodi.',
  },
  query: t.Object({
    page: t.Optional(t.String()),
    limit: t.Optional(t.String()),
    search: t.Optional(t.String()),
    prodiId: t.Optional(t.String()),
  }),
  response: {
    200: t.Any(),
    400: t.Object({ error: t.String() }),
    403: t.Object({ error: t.String() }),
  },
};

export const getRekapPasalSchema = {
  detail: {
    tags: ['Kedisiplinan'],
    summary: 'Rekapitulasi Pasal Pelanggaran Top 10',
    description: 'Mengambil agregasi pelanggaran berdasarkan pasal (Top 10 + Lainnya).',
  },
  query: t.Object({
    programStudiId: t.Optional(t.String()),
  }),
  response: {
    200: t.Object({
      total: t.Number(),
      totalPoin: t.Number(),
      perPasal: t.Array(
        t.Object({
          pasalId: t.Union([t.Number(), t.Null()]),
          nomorPasal: t.String(),
          bunyiPasal: t.String(),
          jenisPelanggaran: t.String(),
          jumlah: t.Number(),
          totalPoin: t.Number(),
        }),
      ),
    }),
    400: t.Object({ error: t.String() }),
    403: t.Object({ error: t.String() }),
  },
};

export const getRekapPelanggaranSchema = {
  detail: {
    tags: ['Kedisiplinan'],
    summary: 'Rekapitulasi Pelanggaran',
    description:
      'Mengambil rekapitulasi pelanggaran per program studi beserta predikat TXLY (T=kali sanksi tertulis, L=sisa sanksi lisan).',
  },
  response: {
    200: t.Object({
      totalPelanggaran: t.Integer(),
      totalMahasiswa: t.Integer(),
      perJenis: t.Array(t.Object({ jenis: t.String(), jumlah: t.Integer(), totalPoin: t.Integer() })),
      perProdi: t.Array(
        t.Object({
          prodiId: t.Union([t.Integer(), t.Null()]),
          prodiNama: t.String(),
          totalPelanggaran: t.Integer(),
          totalPoin: t.Integer(),
        }),
      ),
      topPelanggar: t.Array(
        t.Object({
          mahasiswaId: t.Integer(),
          nim: t.String(),
          nama: t.String(),
          prodiNama: t.String(),
          totalPoin: t.Integer(),
          jumlahPelanggaran: t.Integer(),
          predikat: t.String(),
          degradasiNilaiSikap: t.Number(),
        }),
      ),
    }),
    400: t.Object({ error: t.String() }),
    403: t.Object({ error: t.String() }),
  },
};

export const updatePelanggaranSchema = {
  detail: {
    tags: ['Kedisiplinan'],
    summary: 'Update Catatan Pelanggaran',
    description: 'Memperbarui data pelanggaran mahasiswa berdasarkan ID.',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
  body: t.Partial(t.Omit(pelanggaranBody, ['mahasiswaId'])),
  response: {
    200: pelanggaranResponse,
    400: t.Object({ error: t.String() }),
    403: t.Object({ error: t.String() }),
    404: t.Object({ error: t.String() }),
  },
};

export const importPelanggaranSchema = {
  detail: {
    tags: ['Kedisiplinan'],
    summary: 'Impor Data Peringatan/Pelanggaran via CSV',
    description:
      'Mengimpor data pelanggaran mahasiswa melalui file CSV. Kolom: nim, tanggal, nomor_pasal (opsional), jenis_pelanggaran, jenis_sanksi (L=1 / T=4), keterangan.',
  },
  response: {
    200: t.Object({
      successCount: t.Integer(),
      skippedCount: t.Integer(),
      errors: t.Array(t.Object({ line: t.Integer(), error: t.String() })),
    }),
    400: t.Object({ error: t.String() }),
    403: t.Object({ error: t.String() }),
  },
};

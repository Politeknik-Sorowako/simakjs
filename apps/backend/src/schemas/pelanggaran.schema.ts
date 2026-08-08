import { t } from 'elysia';

export const pelanggaranBody = t.Object({
  mahasiswaId: t.Integer({ default: 1 }),
  tanggal: t.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}$', default: '2026-06-27' }),
  jenisPelanggaran: t.String({ minLength: 3, maxLength: 255, default: 'Keterlambatan masuk kelas praktikum' }),
  bobotPoin: t.Integer({ minimum: 1, maximum: 100, default: 5 }),
  keterangan: t.String({ minLength: 3, maxLength: 1000, default: 'Terlambat lebih dari 30 menit tanpa alasan sah.' }),
});

export const createPelanggaranSchema = {
  detail: {
    tags: ['Kedisiplinan'],
    summary: 'Catat Tindakan Indisipliner',
    description: 'Admin/Dosen mencatat tindakan indisipliner mahasiswa beserta bobot pelanggaran.',
  },
  body: pelanggaranBody,
  response: {
    201: t.Object({
      id: t.Integer({ default: 1 }),
      mahasiswaId: t.Integer({ default: 1 }),
      tanggal: t.String({ default: '2026-06-27' }),
      jenisPelanggaran: t.String({ default: 'Keterlambatan masuk kelas praktikum' }),
      bobotPoin: t.Integer({ default: 5 }),
      keterangan: t.String({ default: 'Terlambat lebih dari 30 menit tanpa alasan sah.' }),
    }),
  },
};

export const getPelanggaranMahasiswaSchema = {
  detail: {
    tags: ['Kedisiplinan'],
    summary: 'Riwayat Pelanggaran Mahasiswa',
    description: 'Mengambil daftar riwayat tindakan indisipliner beserta akumulasi poin pelanggaran mahasiswa.',
  },
  params: t.Object({
    mhsId: t.Numeric(),
  }),
  response: {
    200: t.Object({
      totalPoin: t.Optional(t.Integer({ default: 5 })),
      pelanggaranList: t.Optional(
        t.Array(
          t.Object({
            id: t.Optional(t.Integer({ default: 1 })),
            tanggal: t.Optional(t.String({ default: '2026-06-27' })),
            jenisPelanggaran: t.Optional(t.String({ default: 'Terlambat masuk kelas' })),
            bobotPoin: t.Optional(t.Integer({ default: 5 })),
            keterangan: t.Optional(t.String({ default: 'Terlambat lebih dari 15 menit' })),
            createdAt: t.Optional(t.Union([t.String(), t.Null()])),
          }),
        ),
      ),
    }),
  },
};

export const getAllPelanggaranSchema = {
  detail: {
    tags: ['Kedisiplinan'],
    summary: 'Daftar Semua Pelanggaran',
    description: 'Mengambil semua data pelanggaran mahasiswa untuk keperluan rekap BAAK/Kaprodi.',
  },
  response: {
    200: t.Array(
      t.Object({
        id: t.Optional(t.Integer({ default: 1 })),
        mahasiswaId: t.Optional(t.Integer({ default: 1 })),
        nim: t.Optional(t.String({ default: '202301001' })),
        namaMahasiswa: t.Optional(t.String({ default: 'Andi Pratama' })),
        prodiNama: t.Optional(t.Union([t.String(), t.Null()], { default: 'Teknik Elektro' })),
        tanggal: t.Optional(t.String({ default: '2026-06-27' })),
        jenisPelanggaran: t.Optional(t.String({ default: 'Keterlambatan masuk kelas praktikum' })),
        bobotPoin: t.Optional(t.Integer({ default: 5 })),
        keterangan: t.Optional(t.String({ default: 'Terlambat lebih dari 30 menit tanpa alasan sah.' })),
        createdAt: t.Optional(t.Union([t.String(), t.Null()])),
      }),
    ),
  },
};

export const getRekapPelanggaranSchema = {
  detail: {
    tags: ['Kedisiplinan'],
    summary: 'Rekapitulasi Pelanggaran',
    description: 'Mengambil rekapitulasi pelanggaran per program studi untuk laporan BAAK/Kaprodi.',
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
  body: t.Partial(
    t.Object({
      tanggal: t.Optional(t.String()),
      jenisPelanggaran: t.Optional(t.String()),
      bobotPoin: t.Optional(t.Integer()),
      keterangan: t.Optional(t.String()),
    }),
  ),
  response: {
    200: t.Object({
      id: t.Integer(),
      mahasiswaId: t.Integer(),
      tanggal: t.String(),
      jenisPelanggaran: t.String(),
      bobotPoin: t.Integer(),
      keterangan: t.String(),
      dibuatOleh: t.Union([t.Integer(), t.Null()]),
      createdAt: t.Union([t.String(), t.Null()], { default: null }),
      updatedAt: t.Union([t.String(), t.Null()], { default: null }),
    }),
    400: t.Object({ error: t.String() }),
    403: t.Object({ error: t.String() }),
    404: t.Object({ error: t.String() }),
  },
};

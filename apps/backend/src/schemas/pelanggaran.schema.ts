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

export const createPelanggaranSchema = {
  detail: {
    tags: ['Kedisiplinan'],
    summary: 'Catat Tindakan Indisipliner',
    description:
      'Admin/Dosen/Instruktur mencatat tindakan indisipliner mahasiswa. Pilih pasal BPA, bobot poin otomatis mengikuti jenis sanksi (Lisan=1 / Tertulis=4).',
  },
  body: pelanggaranBody,
  response: {
    201: t.Object({
      id: t.Optional(t.Integer({ default: 1 })),
      mahasiswaId: t.Optional(t.Integer({ default: 1 })),
      tanggal: t.Optional(t.String({ default: '2026-06-27' })),
      jenisPelanggaran: t.Optional(t.String({ default: 'Keterlambatan masuk kelas praktikum' })),
      keterangan: t.Optional(t.String({ default: 'Terlambat lebih dari 30 menit tanpa alasan sah.' })),
      pasalId: t.Optional(t.Union([t.Integer(), t.Null()])),
      jenisSanksi: t.Optional(t.Integer({ default: 1 })),
      pelapor: t.Optional(t.Union([t.String(), t.Null()])),
      dibuatOleh: t.Optional(t.Union([t.Integer(), t.Null()])),
      createdAt: t.Optional(t.Union([t.Date(), t.String(), t.Null()])),
      updatedAt: t.Optional(t.Union([t.Date(), t.String(), t.Null()])),
    }),
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
      totalPoin: t.Optional(t.Integer({ default: 5 })),
      predikat: t.Optional(t.String({ default: 'T1L1' })),
      degradasiNilaiSikap: t.Optional(t.Number({ default: 1.25 })),
      pelanggaranList: t.Optional(
        t.Array(
          t.Object({
            id: t.Optional(t.Integer({ default: 1 })),
            tanggal: t.Optional(t.String({ default: '2026-06-27' })),
            jenisPelanggaran: t.Optional(t.String({ default: 'Terlambat masuk kelas' })),
            bobotPoin: t.Optional(t.Integer({ default: 1 })),
            keterangan: t.Optional(t.String({ default: 'Terlambat lebih dari 15 menit' })),
            pasalId: t.Optional(t.Union([t.Integer(), t.Null()])),
            jenisSanksi: t.Optional(t.Integer({ default: 1 })),
            nomorPasal: t.Optional(t.Union([t.String(), t.Null()])),
            bunyiPasal: t.Optional(t.Union([t.String(), t.Null()])),
            pelapor: t.Optional(t.Union([t.String(), t.Null()])),
            createdAt: t.Optional(t.Union([t.Date(), t.String(), t.Null()])),
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
        programStudiId: t.Optional(t.Union([t.Integer(), t.Null()])),
        jenjang: t.Optional(t.Union([t.String(), t.Null()])),
        dosenPaId: t.Optional(t.Union([t.Integer(), t.Null()])),
        tanggal: t.Optional(t.String({ default: '2026-06-27' })),
        jenisPelanggaran: t.Optional(t.String({ default: 'Keterlambatan masuk kelas praktikum' })),
        bobotPoin: t.Optional(t.Integer({ default: 1 })),
        keterangan: t.Optional(t.String({ default: 'Terlambat lebih dari 30 menit tanpa alasan sah.' })),
        pasalId: t.Optional(t.Union([t.Integer(), t.Null()])),
        jenisSanksi: t.Optional(t.Integer({ default: 1 })),
        nomorPasal: t.Optional(t.Union([t.String(), t.Null()])),
        bunyiPasal: t.Optional(t.Union([t.String(), t.Null()])),
        pelapor: t.Optional(t.Union([t.String(), t.Null()])),
        createdAt: t.Optional(t.Union([t.Date(), t.String(), t.Null()])),
      }),
    ),
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
          prodiId: t.Optional(t.Union([t.Integer(), t.Null()])),
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
          degradasiNilaiSikap: t.Optional(t.Number()),
        }),
      ),
    }),
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
  body: t.Partial(pelanggaranBody),
  response: {
    200: t.Object({
      id: t.Optional(t.Integer({ default: 1 })),
      mahasiswaId: t.Optional(t.Integer({ default: 1 })),
      tanggal: t.Optional(t.String({ default: '2026-06-27' })),
      jenisPelanggaran: t.Optional(t.String({ default: 'Keterlambatan masuk kelas praktikum' })),
      keterangan: t.Optional(t.String({ default: 'Terlambat lebih dari 30 menit tanpa alasan sah.' })),
      pasalId: t.Optional(t.Union([t.Integer(), t.Null()])),
      jenisSanksi: t.Optional(t.Integer({ default: 1 })),
      pelapor: t.Optional(t.Union([t.String(), t.Null()])),
      dibuatOleh: t.Optional(t.Union([t.Integer(), t.Null()])),
      createdAt: t.Optional(t.Union([t.Date(), t.String(), t.Null()])),
      updatedAt: t.Optional(t.Union([t.Date(), t.String(), t.Null()])),
    }),
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
      errors: t.Array(t.Object({ line: t.Integer(), error: t.String() })),
    }),
    400: t.Object({ error: t.String() }),
    403: t.Object({ error: t.String() }),
  },
};

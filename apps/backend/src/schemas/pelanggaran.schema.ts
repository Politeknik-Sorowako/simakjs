import { t } from 'elysia';

export const pelanggaranBody = t.Object({
  mahasiswaId: t.Integer({ default: 1 }),
  tanggal: t.String({ default: '2026-06-27' }),
  jenisPelanggaran: t.String({ minLength: 3, maxLength: 255, default: 'Keterlambatan masuk kelas praktikum' }),
  bobotPoin: t.Integer({ minimum: 1, maximum: 100, default: 5 }),
  keterangan: t.String({ minLength: 3, maxLength: 1000, default: 'Terlambat lebih dari 30 menit tanpa alasan sah.' }),
});

export const createPelanggaranSchema = {
  detail: {
    tags: ['Kedisiplinan'],
    summary: 'Catat Tindakan Indisipliner',
    description: 'Admin/Dosen mencatat tindakan indisipliner mahasiswa beserta bobot pelanggaran.'
  },
  body: pelanggaranBody
};

export const getPelanggaranMahasiswaSchema = {
  detail: {
    tags: ['Kedisiplinan'],
    summary: 'Riwayat Pelanggaran Mahasiswa',
    description: 'Mengambil daftar riwayat tindakan indisipliner beserta akumulasi poin pelanggaran mahasiswa.'
  },
  params: t.Object({
    mhsId: t.Numeric()
  })
};

export const getAllPelanggaranSchema = {
  detail: {
    tags: ['Kedisiplinan'],
    summary: 'Daftar Semua Pelanggaran',
    description: 'Mengambil semua data pelanggaran mahasiswa untuk keperluan rekap BAAK/Kaprodi.'
  }
};

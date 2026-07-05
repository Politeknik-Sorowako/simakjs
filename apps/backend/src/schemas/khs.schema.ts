import { t } from 'elysia';

export const getKhsSchema = {
  detail: {
    tags: ['KHS & Transkrip'],
    summary: 'Ambil Kartu Hasil Studi (KHS) Mahasiswa',
    description:
      'Mengambil nilai akademik per semester beserta kalkulasi IP. Akses diblokir bagi mahasiswa jika terdapat tunggakan SPP atau kompensasi mangkir.',
  },
  params: t.Object({
    mhsId: t.Numeric(),
    periodeId: t.String({ minLength: 1, maxLength: 10 }),
  }),
  response: {
    200: t.Object({
      blocked: t.Optional(t.Boolean({ default: false })),
      reason: t.Optional(t.Union([t.String(), t.Null()], { default: '' })),
      detail: t.Optional(t.Any()),
      krsList: t.Optional(
        t.Array(
          t.Object({
            id: t.Optional(t.Integer({ default: 1 })),
            nilaiAngka: t.Optional(t.Union([t.String(), t.Null()], { default: '85.5' })),
            nilaiHuruf: t.Optional(t.Union([t.String(), t.Null()], { default: 'A' })),
            nilaiIndeks: t.Optional(t.Union([t.String(), t.Null()], { default: '4.0' })),
            isApproved: t.Optional(t.Boolean({ default: true })),
            kelasKuliah: t.Optional(
              t.Object({
                id: t.Optional(t.Integer({ default: 1 })),
                namaKelas: t.Optional(t.String({ default: 'Kelas A' })),
              }),
            ),
            mataKuliah: t.Optional(
              t.Object({
                id: t.Optional(t.Integer({ default: 1 })),
                kode: t.Optional(t.String({ default: 'MK001' })),
                nama: t.Optional(t.String({ default: 'Dasar Pemrograman' })),
                sksTotal: t.Optional(t.Integer({ default: 3 })),
              }),
            ),
          }),
        ),
      ),
      summary: t.Optional(
        t.Object({
          totalSks: t.Optional(t.Integer({ default: 21 })),
          ipSemester: t.Optional(t.Number({ default: 3.75 })),
          ipk: t.Optional(t.Number({ default: 3.65 })),
          totalSksKumulatif: t.Optional(t.Integer({ default: 84 })),
        }),
      ),
    }),
  },
};

export const getTranskripSchema = {
  detail: {
    tags: ['KHS & Transkrip'],
    summary: 'Ambil Transkrip Nilai Akademik Mahasiswa',
    description: 'Mengambil transkrip nilai kumulatif untuk seluruh mata kuliah yang telah diselesaikan mahasiswa.',
  },
  params: t.Object({
    mhsId: t.Numeric(),
  }),
  response: {
    200: t.Object({
      mahasiswa: t.Optional(
        t.Object({
          id: t.Optional(t.Integer({ default: 1 })),
          nim: t.Optional(t.String({ default: '202301001' })),
          nama: t.Optional(t.String({ default: 'Andi Pratama' })),
          prodi: t.Optional(t.String({ default: '-' })),
        }),
      ),
      transkripList: t.Optional(t.Array(t.Any())),
      totalSksLulus: t.Optional(t.Integer({ default: 84 })),
      ipk: t.Optional(t.Number({ default: 3.65 })),
      predikatKelulusan: t.Optional(t.String({ default: '-' })),
    }),
  },
};

export const getExamEligibilitySchema = {
  detail: {
    tags: ['KHS & Transkrip'],
    summary: 'Cek Kelayakan Ujian Mahasiswa',
    description:
      'Mengecek apakah mahasiswa layak mengikuti ujian pada periode tertentu (tidak memiliki tunggakan SPP & kompensasi mangkir).',
  },
  params: t.Object({
    mhsId: t.Numeric(),
    periodeId: t.String({ minLength: 1, maxLength: 10 }),
  }),
  response: {
    200: t.Object({
      mahasiswaId: t.Optional(t.Integer({ default: 1 })),
      periodeId: t.Optional(t.String({ default: '20261' })),
      bimbingan: t.Optional(
        t.Object({
          isApproved: t.Optional(t.Boolean({ default: false })),
          utsInteractionsCount: t.Optional(t.Integer({ default: 0 })),
          uasInteractionsCount: t.Optional(t.Integer({ default: 0 })),
          utsEligible: t.Optional(t.Boolean({ default: false })),
          uasEligible: t.Optional(t.Boolean({ default: false })),
          eligible: t.Optional(t.Boolean({ default: false })),
        }),
      ),
      classes: t.Optional(t.Array(t.Any())),
      overallEligible: t.Optional(t.Boolean({ default: true })),
    }),
  },
};

export const saveKonversiNilaiSchema = {
  detail: {
    tags: ['KHS & Transkrip'],
    summary: 'Simpan / Tambahkan Aturan Konversi Nilai',
    description: 'Menyimpan aturan rentang nilai angka ke huruf.',
  },
  body: t.Object({
    id: t.Optional(t.Integer()),
    programStudiId: t.Optional(t.Union([t.Integer(), t.Null()])),
    nilaiHuruf: t.String({ minLength: 1, maxLength: 5 }),
    bobotIndeks: t.Union([t.String(), t.Number()]),
    nilaiMin: t.Union([t.String(), t.Number()]),
    nilaiMax: t.Union([t.String(), t.Number()]),
    predikat: t.String({ minLength: 1, maxLength: 50 }),
  }),
};

export const saveSkalaPredikatSchema = {
  detail: {
    tags: ['KHS & Transkrip'],
    summary: 'Simpan / Tambahkan Aturan Skala Predikat Kelulusan',
    description: 'Menyimpan aturan rentang IPK ke predikat kelulusan.',
  },
  body: t.Object({
    id: t.Optional(t.Integer()),
    ipkMin: t.Union([t.String(), t.Number()]),
    ipkMax: t.Union([t.String(), t.Number()]),
    predikat: t.String({ minLength: 1, maxLength: 100 }),
  }),
};

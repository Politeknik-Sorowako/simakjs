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
      detail: t.Optional(t.Union([t.String(), t.Null()], { default: null })),
      warningTunggakan: t.Optional(
        t.Object({
          reason: t.Union([t.String(), t.Null()]),
          detail: t.Union([t.String(), t.Null()]),
        }),
      ),
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

export const getByNimSchema = {
  detail: {
    tags: ['KHS & Transkrip'],
    summary: 'Ambil KHS Berdasarkan NIM (resolver)',
    description:
      'Resolver NIM untuk mengambil KHS mahasiswa. Mahasiswa hanya dapat mengakses NIM sendiri; admin/staff bebas dengan flag warningTunggakan untuk watermark cetak.',
  },
  query: t.Object({
    nim: t.String({ minLength: 1, maxLength: 30 }),
    periodeId: t.String({ minLength: 1, maxLength: 10 }),
  }),
  response: {
    200: t.Object({
      blocked: t.Optional(t.Boolean({ default: false })),
      reason: t.Optional(t.Union([t.String(), t.Null()], { default: '' })),
      detail: t.Optional(t.Union([t.String(), t.Null()], { default: null })),
      warningTunggakan: t.Optional(
        t.Object({
          reason: t.Union([t.String(), t.Null()]),
          detail: t.Union([t.String(), t.Null()]),
        }),
      ),
      krsList: t.Optional(
        t.Array(
          t.Object({
            id: t.Optional(t.Integer()),
            nilaiAngka: t.Optional(t.Union([t.String(), t.Null()])),
            nilaiHuruf: t.Optional(t.Union([t.String(), t.Null()])),
            nilaiIndeks: t.Optional(t.Union([t.String(), t.Null()])),
            isApproved: t.Optional(t.Boolean()),
            kelasKuliah: t.Optional(t.Object({ id: t.Optional(t.Integer()), namaKelas: t.Optional(t.String()) })),
            mataKuliah: t.Optional(
              t.Object({
                id: t.Optional(t.Integer()),
                kode: t.Optional(t.String()),
                nama: t.Optional(t.String()),
                sksTotal: t.Optional(t.Integer()),
              }),
            ),
          }),
        ),
      ),
      summary: t.Optional(
        t.Object({
          totalSks: t.Optional(t.Integer()),
          ipSemester: t.Optional(t.Number()),
          ipk: t.Optional(t.Number()),
          totalSksKumulatif: t.Optional(t.Integer()),
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
      transkripList: t.Optional(
        t.Array(
          t.Object({
            mataKuliahKode: t.Optional(t.String()),
            mataKuliahNama: t.Optional(t.String()),
            sks: t.Optional(t.Integer()),
            nilaiHuruf: t.Optional(t.String()),
            nilaiIndeks: t.Optional(t.String()),
          }),
        ),
      ),
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
      classes: t.Optional(
        t.Array(
          t.Object({
            kelasKuliahId: t.Optional(t.Integer()),
            namaKelas: t.Optional(t.String()),
            mataKuliahNama: t.Optional(t.String()),
            mataKuliahKode: t.Optional(t.String()),
            totalMeetings: t.Optional(t.Integer()),
            presentMeetings: t.Optional(t.Integer()),
            attendanceRate: t.Optional(t.Number()),
            eligible: t.Optional(t.Boolean()),
            reasons: t.Optional(
              t.Object({
                attendance: t.Optional(t.String()),
                bimbingan: t.Optional(t.String()),
              }),
            ),
          }),
        ),
      ),
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

export const getRekapNilaiSchema = {
  detail: {
    tags: ['KHS & Transkrip'],
    summary: 'Rekap Nilai Mahasiswa',
    description: 'Mengambil rekapitulasi nilai mahasiswa untuk semua mata kuliah yang telah ditempuh.',
  },
  params: t.Object({
    mhsId: t.Numeric(),
  }),
};

export const getRekapPerProdiSchema = {
  detail: {
    tags: ['KHS & Transkrip'],
    summary: 'Rekap Nilai per Program Studi',
    description: 'Mengambil rekapitulasi nilai mahasiswa untuk seluruh mahasiswa dalam suatu program studi.',
  },
  query: t.Object({
    periodeId: t.Optional(t.String()),
  }),
};

export const getMatriksNilaiSchema = {
  detail: {
    tags: ['KHS & Transkrip'],
    summary: 'Matriks Nilai Mata Kuliah (A-E)',
    description: 'Mengambil matriks sebaran nilai A-E per mata kuliah.',
  },
  query: t.Object({
    periodeId: t.Optional(t.String()),
    prodiId: t.Optional(t.String()),
    search: t.Optional(t.String()),
    page: t.Optional(t.String()),
    limit: t.Optional(t.String()),
  }),
};

export const getAllKonversiSchema = {
  detail: {
    tags: ['KHS & Transkrip'],
    summary: 'Daftar Aturan Konversi Nilai',
    description: 'Mengambil semua aturan konversi nilai angka ke huruf yang terdaftar.',
  },
};

export const getKonversiRekapSchema = {
  detail: {
    tags: ['KHS & Transkrip'],
    summary: 'Rekap Aturan Konversi & Nilai di Luar Rentang',
    description:
      'Mengambil aturan konversi nilai global beserta usulan rentang baru (saat skala berubah) dan jumlah nilai mahasiswa di luar rentang target.',
  },
  query: t.Object({
    targetMax: t.Optional(t.String()),
  }),
};

export const bulkSaveKonversiSchema = {
  detail: {
    tags: ['KHS & Transkrip'],
    summary: 'Konfirmasi Massal Perubahan Aturan Konversi Nilai',
    description:
      'Menyimpan perubahan sekumpulan aturan konversi nilai sekaligus. Setiap baris diproses individual; kegagalan satu baris tidak membatalkan baris lain.',
  },
  body: t.Object({
    targetMax: t.Optional(t.Numeric()),
    rules: t.Array(
      t.Object({
        id: t.Numeric(),
        nilaiHuruf: t.Optional(t.String()),
        bobotIndeks: t.Optional(t.Union([t.String(), t.Number()])),
        nilaiMin: t.Union([t.String(), t.Number()]),
        nilaiMax: t.Union([t.String(), t.Number()]),
        predikat: t.Optional(t.String()),
      }),
    ),
  }),
};

export const deleteKonversiSchema = {
  detail: {
    tags: ['KHS & Transkrip'],
    summary: 'Hapus Aturan Konversi Nilai',
    description: 'Menghapus aturan konversi nilai berdasarkan ID.',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
};

export const getAllPredikatSchema = {
  detail: {
    tags: ['KHS & Transkrip'],
    summary: 'Daftar Skala Predikat Kelulusan',
    description: 'Mengambil semua aturan skala predikat kelulusan berdasarkan rentang IPK.',
  },
};

export const deletePredikatSchema = {
  detail: {
    tags: ['KHS & Transkrip'],
    summary: 'Hapus Skala Predikat Kelulusan',
    description: 'Menghapus aturan skala predikat kelulusan berdasarkan ID.',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
};

export const getDetailNilaiMKSchema = {
  detail: {
    tags: ['KHS & Transkrip'],
    summary: 'Detail Nilai Mata Kuliah',
    description: 'Mengambil detail nilai peserta dan BAP perkuliahan suatu mata kuliah.',
  },
  params: t.Object({
    mataKuliahId: t.String(),
  }),
  query: t.Object({
    periodeId: t.Optional(t.String()),
  }),
};

export const getRincianKomponenSchema = {
  detail: {
    tags: ['KHS & Transkrip'],
    summary: 'Rincian Nilai per Komponen (Mahasiswa)',
    description:
      'Mengambil nilai akhir dan rincian per komponen (tanpa sub-komponen) milik mahasiswa pada suatu kelas kuliah.',
  },
  query: t.Object({
    kelasKuliahId: t.Numeric(),
    mahasiswaId: t.Optional(t.Numeric()),
  }),
  response: {
    200: t.Object({
      krsId: t.Integer({ default: 1 }),
      nilaiAngka: t.Union([t.String(), t.Null()], { default: '85.5' }),
      nilaiHuruf: t.Union([t.String(), t.Null()], { default: 'A' }),
      nilaiIndeks: t.Union([t.String(), t.Null()], { default: '4.0' }),
      komponen: t.Array(
        t.Object({
          nama: t.String({ default: 'UTS' }),
          bobot: t.Integer({ default: 30 }),
          nilai: t.Union([t.Number(), t.Null()], { default: 80 }),
        }),
      ),
    }),
  },
};

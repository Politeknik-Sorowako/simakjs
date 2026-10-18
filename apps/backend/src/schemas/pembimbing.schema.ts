import { t } from 'elysia';

const pembimbingTags = ['Pembimbing'];
const jenisPembimbing = t.Union([t.Literal('PKL'), t.Literal('TA_UTAMA'), t.Literal('TA_PENDAMPING')]);

/**
 * Identitas pembimbing: internal (dosenId terisi) atau eksternal/industri
 * (dosenId null + nama & instansi wajib). Syarat "//" ditegakkan di service
 * karena bergantung pada kombinasi kedua cabang.
 */
const identitasPembimbing = {
  dosenId: t.Optional(t.Union([t.Integer(), t.Null()])),
  namaEksternal: t.Optional(t.Union([t.String({ maxLength: 100 }), t.Null()])),
  instansiEksternal: t.Optional(t.Union([t.String({ maxLength: 255 }), t.Null()])),
  catatan: t.Optional(t.Union([t.String(), t.Null()])),
};

export const getPembimbingSchema = {
  detail: {
    tags: pembimbingTags,
    summary: 'Daftar penetapan pembimbing mahasiswa',
    description:
      'Menampilkan mahasiswa beserta penetapan pembimbing aktif per jenis (PKL, TA_UTAMA, TA_PENDAMPING) dan Dosen PA read-only.',
  },
  query: t.Object({
    programStudiId: t.Optional(t.Numeric()),
    angkatan: t.Optional(t.String({ maxLength: 4 })),
    angkatanIds: t.Optional(t.String({ maxLength: 200 })),
    jenis: t.Optional(jenisPembimbing),
    belumDitetapkan: t.Optional(t.Boolean()),
    status: t.Optional(t.Union([t.Literal('aktif'), t.Literal('semua')])),
    search: t.Optional(t.String({ maxLength: 100 })),
    page: t.Optional(t.Numeric({ minimum: 1 })),
    limit: t.Optional(t.Numeric({ minimum: 1, maximum: 200 })),
  }),
};

export const getPembimbingMahasiswaSchema = {
  detail: {
    tags: pembimbingTags,
    summary: 'Rincian penetapan pembimbing satu mahasiswa',
  },
  params: t.Object({ mahasiswaId: t.Numeric() }),
};

export const setPembimbingSchema = {
  detail: {
    tags: pembimbingTags,
    summary: 'Tetapkan/ganti pembimbing satu mahasiswa',
    description:
      'Mencatat penetapan pembimbing untuk satu jenis. Penetapan aktif sebelumnya dinonaktifkan (riwayat disimpan), lalu baris baru di-insert.',
  },
  body: t.Object({
    mahasiswaId: t.Integer({ minimum: 1 }),
    jenis: jenisPembimbing,
    ...identitasPembimbing,
  }),
};

export const bulkSetPembimbingSchema = {
  detail: {
    tags: pembimbingTags,
    summary: 'Tetapkan pembimbing untuk banyak mahasiswa',
    description:
      'Menetapkan satu pembimbing untuk satu jenis pada banyak mahasiswa. Kesalahan per mahasiswa dilaporkan pada `errors` tanpa membatalkan yang lain.',
  },
  body: t.Object({
    mahasiswaIds: t.Array(t.Integer({ minimum: 1 }), { minItems: 1, maxItems: 500 }),
    jenis: jenisPembimbing,
    ...identitasPembimbing,
  }),
};

export const nonaktifkanPembimbingSchema = {
  detail: {
    tags: pembimbingTags,
    summary: 'Nonaktifkan penetapan pembimbing',
    description: 'Menonaktifkan penetapan (status_aktif=false). Riwayat tidak dihapus.',
  },
  params: t.Object({ id: t.Numeric() }),
};

export const getImporPembimbingSchema = {
  detail: {
    tags: pembimbingTags,
    summary: 'Unduh contoh CSV penetapan pembimbing',
  },
};

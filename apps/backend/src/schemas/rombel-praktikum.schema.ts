import { t } from 'elysia';

export const createRombelBody = t.Object({
  kelasKuliahId: t.Integer(),
  namaGroup: t.String(),
  instrukturId: t.Optional(t.Nullable(t.Integer())),
  keterangan: t.Optional(t.Nullable(t.String())),
});

export const updateRombelBody = t.Partial(createRombelBody);

export const assignMahasiswaBody = t.Object({
  mahasiswaIds: t.Array(t.Integer()),
});

export const createBapPraktikumBody = t.Object({
  rombelPraktikumId: t.Integer(),
  tanggal: t.String(),
  sesiKe: t.Integer({ default: 1 }),
  tema: t.Optional(t.Nullable(t.String())),
  materi: t.String(),
  catatan: t.Optional(t.Nullable(t.String())),
  durasiMenit: t.Integer({ default: 100 }),
  instrukturId: t.Optional(t.Nullable(t.Integer())),
  topikIds: t.Optional(t.Array(t.Integer())),
  sesiIds: t.Optional(t.Array(t.Integer())),
});

export const updateBapPraktikumBody = t.Partial(createBapPraktikumBody);

export const savePresensiPraktikumBody = t.Object({
  bapPraktikumId: t.Integer(),
  presensiList: t.Array(
    t.Object({
      mahasiswaId: t.Integer(),
      status: t.Union([
        t.Literal('hadir'),
        t.Literal('izin'),
        t.Literal('sakit'),
        t.Literal('alpa'),
        t.Literal('telat'),
      ]),
      durasiMangkir: t.Optional(t.Integer()),
      keterangan: t.Optional(t.String()),
    }),
  ),
});

export const syncBapPraktikumBody = t.Object({
  bapPraktikumId: t.Integer(),
});

export const generateEnrollmentTokenSchema = {
  detail: {
    tags: ['Rombel Praktikum'],
    summary: 'Generate Enrollment Token',
    description: 'Membuat atau memperbarui token unik untuk pendaftaran mandiri mahasiswa ke rombel praktikum.',
  },
};

export const toggleEnrollmentBody = t.Object({
  enabled: t.Boolean(),
});

export const publicRombelInfoSchema = {
  detail: {
    tags: ['Rombel Praktikum'],
    summary: 'Info Rombel Publik (Self-Enrollment)',
    description: 'Mengambil informasi rombel praktikum berdasarkan token pendaftaran (tanpa autentikasi).',
  },
  params: t.Object({
    token: t.String(),
  }),
};

export const publicEnrollParamsSchema = {
  detail: {
    tags: ['Rombel Praktikum'],
    summary: 'Self-Enrollment Mahasiswa',
    description:
      'Pendaftaran mandiri mahasiswa ke rombel praktikum menggunakan token. Mahasiswa terautentikasi, mahasiswaId diambil dari sesi yang sedang login.',
  },
  params: t.Object({
    token: t.String(),
  }),
};

export const getEnrollmentLogSchema = {
  detail: {
    tags: ['Rombel Praktikum'],
    summary: 'Log Self-Enrollment',
    description: 'Mengambil log mahasiswa yang berhasil melakukan self-enrollment pada rombel.',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
};

import { t } from 'elysia';

export const getMahasiswaSchema = {
  detail: {
    tags: ['Mahasiswa'],
    summary: 'Daftar Mahasiswa',
    description: 'Mengambil semua data mahasiswa yang terdaftar.'
  },
  response: {
    200: t.Array(
      t.Object({
        id: t.Integer({ default: 1 }),
        nim: t.String({ default: '12345678' }),
        nama: t.String({ default: 'Budi Santoso' }),
        email: t.String({ default: 'budi@test.com' }),
        programStudiId: t.Union([t.Integer(), t.Null()], { default: 1 }),
        status: t.String({ default: 'aktif' }),
        namaIbuKandung: t.String({ default: 'Ibu Budi' }),
        nik: t.String({ default: '1234567890123456' }),
        jenisKelamin: t.String({ default: 'L' }),
        tanggalLahir: t.String({ default: '2000-01-01' }),
        idPddikti: t.Union([t.String(), t.Null()], { default: null })
      })
    )
  }
};

export const createMahasiswaSchema = {
  detail: {
    tags: ['Mahasiswa'],
    summary: 'Tambah Mahasiswa Baru',
    description: 'Menambahkan mahasiswa baru lengkap dengan data wajib PDDIKTI (Hanya dapat diakses Admin / Dosen dengan token JWT).'
  },
  body: t.Object({
    nim: t.String({ default: '12345678' }),
    nama: t.String({ default: 'Budi Santoso' }),
    email: t.String({ format: 'email', default: 'budi@test.com' }),
    programStudiId: t.Integer({ default: 1 }),
    status: t.Optional(t.String({ default: 'aktif' })),
    idPddikti: t.Optional(t.String()),
    namaIbuKandung: t.String({ default: 'Ibu Budi' }),
    nik: t.String({ minLength: 16, maxLength: 16, default: '1234567890123456' }),
    jenisKelamin: t.Union([t.Literal('L'), t.Literal('P')], { default: 'L' }),
    tanggalLahir: t.String({ default: '2000-01-01' })
  }),
  response: {
    201: t.Object({
      id: t.Integer({ default: 1 }),
      nim: t.String({ default: '12345678' }),
      nama: t.String({ default: 'Budi Santoso' }),
      email: t.String({ default: 'budi@test.com' }),
      programStudiId: t.Integer({ default: 1 }),
      status: t.String({ default: 'aktif' }),
      namaIbuKandung: t.String({ default: 'Ibu Budi' }),
      nik: t.String({ default: '1234567890123456' }),
      jenisKelamin: t.String({ default: 'L' }),
      tanggalLahir: t.String({ default: '2000-01-01T00:00:00.000Z' }),
      idPddikti: t.Union([t.String(), t.Null()], { default: null })
    }),
    403: t.Object({
      error: t.String({ default: 'Akses ditolak.' })
    }),
    422: t.Object({
      message: t.String({ default: 'Validation error message...' })
    })
  }
};

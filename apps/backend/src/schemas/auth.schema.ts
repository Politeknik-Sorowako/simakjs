import { t } from 'elysia';

export const registerSchema = {
  detail: {
    tags: ['Autentikasi'],
    summary: 'Registrasi Pengguna Baru',
    description: 'Mendaftarkan akun baru ke sistem dengan role admin, dosen, mahasiswa, prodi, keuangan, atau guest.'
  },
  body: t.Object({
    email: t.String({ format: 'email', default: 'admin@test.com' }),
    password: t.String({ minLength: 6, default: 'password123' }),
    nama: t.String({ minLength: 3, default: 'Nama Pengguna' }),
    role: t.Optional(t.Union([t.Literal('admin'), t.Literal('dosen'), t.Literal('mahasiswa'), t.Literal('prodi'), t.Literal('keuangan'), t.Literal('guest')], { default: 'mahasiswa' }))
  }),
  response: {
    201: t.Object({
      message: t.String({ default: 'Registrasi berhasil' }),
      user: t.Object({
        id: t.Integer({ default: 1 }),
        email: t.String({ default: 'admin@test.com' }),
        nama: t.String({ default: 'Nama Pengguna' }),
        role: t.String({ default: 'admin' })
      })
    }),
    400: t.Object({
      error: t.String({ default: 'Email sudah terdaftar' })
    })
  }
};

export const loginSchema = {
  detail: {
    tags: ['Autentikasi'],
    summary: 'Login Pengguna',
    description: 'Login menggunakan email dan password untuk mendapatkan token JWT.'
  },
  body: t.Object({
    email: t.String({ format: 'email', default: 'admin@test.com' }),
    password: t.String({ default: 'password123' })
  }),
  response: {
    200: t.Object({
      message: t.String({ default: 'Login berhasil' }),
      token: t.String({ default: 'eyJhbGciOiJIUzI1NiIsInR... (JWT string)' }),
      user: t.Object({
        id: t.Integer({ default: 1 }),
        email: t.String({ default: 'admin@test.com' }),
        nama: t.String({ default: 'Nama Pengguna' }),
        role: t.String({ default: 'admin' })
      })
    }),
    401: t.Object({
      error: t.String({ default: 'Email atau password salah' })
    })
  }
};

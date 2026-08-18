import { t } from 'elysia';

export const registerSchema = {
  detail: {
    tags: ['Autentikasi'],
    summary: 'Registrasi Pengguna Baru',
    description:
      'Mendaftarkan akun baru ke sistem dengan role dosen, mahasiswa, atau guest. Admin, prodi, dan keuangan tidak dapat registrasi mandiri.',
  },
  body: t.Object({
    email: t.String({ format: 'email', description: 'Alamat email pengguna' }),
    password: t.String({
      minLength: 6,
      description: 'Kata sandi (min. 6 karakter)',
    }),
    nama: t.String({ minLength: 3, default: 'Nama Pengguna' }),
    role: t.Optional(
      t.Union([t.Literal('dosen'), t.Literal('mahasiswa'), t.Literal('guest')], { default: 'mahasiswa' }),
    ),
  }),
  response: {
    201: t.Object({
      message: t.String({ default: 'Registrasi berhasil' }),
      user: t.Object({
        id: t.Integer({ default: 1 }),
        email: t.String({ default: 'user@example.com' }),
        nama: t.String({ default: 'Nama Pengguna' }),
        role: t.String({ default: 'mahasiswa' }),
      }),
    }),
    400: t.Object({
      error: t.String({ default: 'Email sudah terdaftar' }),
    }),
    403: t.Object({
      error: t.String({ default: 'Registrasi dengan role tersebut tidak diizinkan.' }),
    }),
  },
};

export const validateResetTokenSchema = {
  detail: {
    tags: ['Autentikasi'],
    summary: 'Validasi Token Reset Password',
    description:
      'Memvalidasi token reset password dan mengambil email pengguna. Token hanya valid 1 jam dan single-use.',
  },
  body: t.Object({
    token: t.String({ description: 'Token dari email reset password' }),
  }),
  response: {
    200: t.Object({
      email: t.String({ default: 'user@example.com' }),
    }),
    400: t.Object({
      error: t.String({ default: 'Token reset password tidak valid atau kedaluwarsa' }),
    }),
  },
};

export const resetPasswordSchema = {
  detail: {
    tags: ['Autentikasi'],
    summary: 'Reset Password dengan Token',
    description:
      'Mengatur ulang password menggunakan token reset. Password minimal 8 karakter dengan huruf kapital dan angka.',
  },
  body: t.Object({
    token: t.String({ description: 'Token dari email reset password' }),
    password: t.String({
      minLength: 8,
      description: 'Password baru (min. 8 karakter, harus ada huruf kapital dan angka)',
    }),
  }),
  response: {
    200: t.Object({
      message: t.String({ default: 'Password Anda berhasil diubah. Silakan login kembali.' }),
    }),
    400: t.Object({
      error: t.String({ default: 'Token reset password tidak valid atau kedaluwarsa' }),
    }),
    422: t.Object({
      success: t.Boolean(),
      error: t.String(),
      message: t.String(),
    }),
  },
};

export const forgotPasswordSchema = {
  detail: {
    tags: ['Autentikasi'],
    summary: 'Lupa Password',
    description: 'Meminta link reset password via email. Token valid 1 jam dan single-use.',
  },
  body: t.Object({
    email: t.String({ format: 'email', description: 'Alamat email pengguna' }),
  }),
  response: {
    200: t.Union([
      t.Object({
        message: t.String({ default: 'Jika email terdaftar, link reset password telah dikirim.' }),
      }),
      t.Object({
        message: t.String({ default: 'Jika email terdaftar, link reset password telah dikirim.' }),
        token: t.String(),
      }),
    ]),
    429: t.Object({
      error: t.String({ default: 'Terlalu banyak permintaan. Silakan coba lagi dalam 15 menit.' }),
      retryAfter: t.Number({ default: 900 }),
    }),
  },
};

export const loginSchema = {
  detail: {
    tags: ['Autentikasi'],
    summary: 'Login Pengguna',
    description: 'Login menggunakan email dan password untuk mendapatkan token JWT.',
  },
  body: t.Object({
    email: t.String({ format: 'email', description: 'Alamat email pengguna' }),
    password: t.String({ description: 'Kata sandi' }),
  }),
  response: {
    200: t.Object({
      message: t.String({ default: 'Login berhasil' }),
      token: t.String({ default: 'eyJhbGciOiJIUzI1NiIsInR...' }),
      user: t.Object({
        id: t.Integer({ default: 1 }),
        email: t.String({ default: 'user@example.com' }),
        nama: t.String({ default: 'Nama Pengguna' }),
        role: t.String({ default: 'mahasiswa' }),
        mustChangePassword: t.Optional(t.Boolean({ default: false })),
        theme: t.Optional(t.String()),
        avatar: t.Optional(t.String()),
      }),
    }),
    401: t.Object({
      error: t.String({ default: 'Email atau password salah' }),
    }),
    429: t.Object({
      error: t.String({ default: 'Terlalu banyak percobaan login. Silakan coba lagi.' }),
      retryAfter: t.Number({ default: 900 }),
    }),
  },
};

export const clearRateLimitSchema = {
  detail: {
    tags: ['Autentikasi'],
    summary: 'Bersihkan Rate Limit Login',
    description:
      'Menghapus rate limit percobaan login dan forgot-password untuk sebuah email. Hanya dapat diakses oleh Admin/Super Admin.',
  },
  body: t.Object({
    email: t.String({ format: 'email', description: 'Alamat email yang rate limit-nya akan dibersihkan' }),
  }),
  response: {
    200: t.Object({
      message: t.String({ default: 'Rate limit berhasil dibersihkan.' }),
      loginCleared: t.Boolean(),
      forgotCleared: t.Boolean(),
    }),
    400: t.Object({
      error: t.String({ default: 'Email wajib diisi' }),
    }),
    403: t.Object({
      error: t.String({ default: 'Akses ditolak. Hanya Admin.' }),
    }),
    404: t.Object({
      error: t.String({ default: 'Tidak ada rate limit aktif untuk email tersebut.' }),
    }),
  },
};

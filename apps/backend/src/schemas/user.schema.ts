import { t } from 'elysia';

export const userBody = t.Object({
  email: t.String({ format: 'email', default: 'user@test.com' }),
  nama: t.String({ default: 'Nama Pengguna' }),
  role: t.Union(
    [
      t.Literal('admin'),
      t.Literal('dosen'),
      t.Literal('mahasiswa'),
      t.Literal('prodi'),
      t.Literal('keuangan'),
      t.Literal('guest'),
    ],
    { default: 'mahasiswa' },
  ),
  isActive: t.Optional(t.Boolean({ default: true })),
});

export const getAllUsersSchema = {
  detail: {
    tags: ['Pengguna'],
    summary: 'Daftar Semua Pengguna',
    description: 'Mengambil semua data pengguna yang terdaftar di sistem.',
  },
  response: {
    200: t.Array(
      t.Object({
        id: t.Integer({ default: 1 }),
        email: t.String({ default: 'admin@test.com' }),
        nama: t.String({ default: 'Admin SIMAK' }),
        role: t.String({ default: 'admin' }),
        isActive: t.Boolean({ default: true }),
        theme: t.String({ default: 'light' }),
        avatar: t.Union([t.String(), t.Null()], { default: null }),
        createdAt: t.Any(),
        updatedAt: t.Any(),
      }),
    ),
  },
};

export const updateProfileSchema = {
  detail: {
    tags: ['Pengguna'],
    summary: 'Perbarui Profil Sendiri',
    description: 'Memperbarui data profil pengguna yang sedang login (nama, email, password).',
  },
  body: t.Partial(
    t.Object({
      nama: t.String(),
      email: t.String({ format: 'email' }),
      currentPassword: t.String(),
      newPassword: t.String({ minLength: 6 }),
      theme: t.String(),
      avatar: t.String(),
    }),
  ),
};

export const toggleActiveSchema = {
  detail: {
    tags: ['Pengguna'],
    summary: 'Aktif/Nonaktifkan Pengguna',
    description: 'Mengubah status aktif/nonaktif pengguna berdasarkan ID.',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
  response: {
    200: t.Object({
      message: t.String({ default: 'Status pengguna berhasil diubah' }),
    }),
    403: t.Object({
      error: t.String({ default: 'Akses ditolak.' }),
    }),
    404: t.Object({
      error: t.String({ default: 'Pengguna tidak ditemukan' }),
    }),
  },
};

export const updateRoleSchema = {
  detail: {
    tags: ['Pengguna'],
    summary: 'Ubah Role Pengguna',
    description: 'Memperbarui role/hak akses pengguna berdasarkan ID.',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
  body: t.Object({
    role: t.Union(
      [
        t.Literal('admin'),
        t.Literal('dosen'),
        t.Literal('mahasiswa'),
        t.Literal('prodi'),
        t.Literal('keuangan'),
        t.Literal('guest'),
      ],
      { default: 'mahasiswa' },
    ),
  }),
  response: {
    200: t.Object({
      message: t.String({ default: 'Role pengguna berhasil diubah' }),
    }),
    403: t.Object({
      error: t.String({ default: 'Akses ditolak.' }),
    }),
    404: t.Object({
      error: t.String({ default: 'Pengguna tidak ditemukan' }),
    }),
  },
};

export const importUsersCsvSchema = {
  detail: {
    tags: ['Pengguna'],
    summary: 'Impor Pengguna dari CSV',
    description: 'Mengimpor data pengguna secara massal dari file CSV.',
  },
};

export const generateAccountsSchema = {
  detail: {
    tags: ['Pengguna'],
    summary: 'Generate Akun Massal',
    description: 'Membuat akun pengguna secara massal (misalnya untuk seluruh mahasiswa baru).',
  },
  body: t.Optional(
    t.Object({
      role: t.Optional(
        t.Union(
          [
            t.Literal('dosen'),
            t.Literal('mahasiswa'),
            t.Literal('guest'),
          ],
          { default: 'mahasiswa' },
        ),
      ),
      jumlah: t.Optional(t.Integer({ default: 1 })),
    }),
  ),
};

export const userResponseObject = t.Object({
  id: t.Integer({ default: 1 }),
  email: t.String({ default: 'user@test.com' }),
  nama: t.String({ default: 'Nama Pengguna' }),
  role: t.String({ default: 'mahasiswa' }),
  isActive: t.Boolean({ default: true }),
  theme: t.String({ default: 'light' }),
  avatar: t.Union([t.String(), t.Null()], { default: null }),
  createdAt: t.Any(),
  updatedAt: t.Any(),
});

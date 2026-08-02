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
      t.Literal('calon_mahasiswa'),
    ],
    { default: 'mahasiswa' },
  ),
  isActive: t.Optional(t.Boolean({ default: true })),
});

export const getAllUsersSchema = {
  detail: {
    tags: ['Pengguna'],
    summary: 'Daftar Semua Pengguna',
    description: 'Mengambil semua data pengguna. **Hanya Admin** yang dapat mengakses.',
  },
  response: {
    200: t.Object({
      data: t.Array(
        t.Object({
          id: t.Integer({ default: 1 }),
          email: t.String({ default: 'user@example.com' }),
          nama: t.String({ default: 'Nama Pengguna' }),
          role: t.String({ default: 'mahasiswa' }),
          isActive: t.Boolean({ default: true }),
          mustChangePassword: t.Optional(t.Boolean({ default: false })),
          theme: t.String({ default: 'light' }),
          avatar: t.Union([t.String(), t.Null()], { default: null }),
          createdAt: t.Any(),
          updatedAt: t.Any(),
        }),
      ),
      meta: t.Object({
        total: t.Number({ default: 0 }),
        page: t.Number({ default: 1 }),
        limit: t.Number({ default: 10 }),
        totalPages: t.Number({ default: 1 }),
      }),
    }),
  },
};

export const updateProfileSchema = {
  detail: {
    tags: ['Pengguna'],
    summary: 'Perbarui Profil Sendiri',
    description: 'Memperbarui data profil pengguna yang sedang login. Password tidak dikembalikan dalam response.',
  },
  body: t.Partial(
    t.Object({
      nama: t.String(),
      email: t.String({ format: 'email' }),
      currentPassword: t.String(),
      password: t.String({ minLength: 6 }),
      theme: t.String(),
      avatar: t.String(),
    }),
  ),
  response: {
    200: t.Object({
      message: t.String({ default: 'Profil Anda berhasil diperbarui' }),
      user: t.Object({
        id: t.Integer(),
        email: t.String(),
        nama: t.String(),
        role: t.String(),
        mustChangePassword: t.Optional(t.Boolean({ default: false })),
        theme: t.String(),
        avatar: t.Union([t.String(), t.Null()]),
      }),
    }),
    400: t.Object({
      error: t.String({ default: 'Nama minimal harus 3 karakter' }),
    }),
  },
};

export const toggleActiveSchema = {
  detail: {
    tags: ['Pengguna'],
    summary: 'Aktif/Nonaktifkan Pengguna',
    description:
      'Mengubah status aktif/nonaktif pengguna. **Hanya Admin** yang dapat mengakses. Admin tidak dapat menonaktifkan akun sendiri.',
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
    description:
      'Memperbarui role/hak akses pengguna. **Hanya Admin** yang dapat mengakses. Admin tidak dapat mengubah role akun sendiri.',
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
        t.Literal('calon_mahasiswa'),
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
    description: 'Mengimpor data pengguna secara massal dari file CSV. **Hanya Admin** yang dapat mengakses.',
  },
};

export const generateAccountsSchema = {
  detail: {
    tags: ['Pengguna'],
    summary: 'Generate Akun Massal',
    description: 'Membuat akun pengguna secara massal. **Hanya Admin** yang dapat mengakses.',
  },
  body: t.Object({
    targetType: t.Union([t.Literal('dosen'), t.Literal('mahasiswa')]),
    ids: t.Array(t.Number()),
  }),
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

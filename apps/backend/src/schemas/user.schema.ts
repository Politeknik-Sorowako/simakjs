import { t } from 'elysia';

export const userRoleItemSchema = t.Union(
  [
    t.Literal('super_admin'),
    t.Literal('admin'),
    t.Literal('kaprodi'),
    t.Literal('dosen'),
    t.Literal('mahasiswa'),
    t.Literal('prodi'),
    t.Literal('keuangan'),
    t.Literal('guest'),
    t.Literal('calon_mahasiswa'),
    t.Literal('plp'),
    t.Literal('instruktur'),
    t.Literal('kemahasiswaan'),
    t.Literal('lppm'),
    t.Literal('wadir1'),
    t.Literal('wadir2'),
    t.Literal('wadir3'),
    t.Literal('direktur'),
  ],
  { default: 'mahasiswa' },
);

export const userBody = t.Object({
  email: t.String({ format: 'email', default: 'user@test.com' }),
  nama: t.String({ default: 'Nama Pengguna' }),
  role: userRoleItemSchema,
  isActive: t.Optional(t.Boolean({ default: true })),
});

export const getAllUsersSchema = {
  detail: {
    tags: ['Pengguna'],
    summary: 'Daftar Semua Pengguna',
    description: 'Mengambil semua data pengguna. **Hanya Admin** yang dapat mengakses.',
  },
  query: t.Object({
    page: t.Optional(t.String()),
    limit: t.Optional(t.String()),
    search: t.Optional(t.String()),
    filterRole: t.Optional(t.String()),
    filterStatus: t.Optional(t.String()),
    sortBy: t.Optional(t.String()),
    sortOrder: t.Optional(t.String()),
  }),
  response: {
    200: t.Object({
      data: t.Array(
        t.Object({
          id: t.Integer({ default: 1 }),
          email: t.String({ default: 'user@example.com' }),
          nama: t.String({ default: 'Nama Pengguna' }),
          role: t.String({ default: 'mahasiswa' }),
          roles: t.Array(t.String({ default: 'mahasiswa' })),
          prodiIds: t.Array(t.Number({ default: 0 })),
          isActive: t.Boolean({ default: true }),
          mustChangePassword: t.Optional(t.Boolean({ default: false })),
          theme: t.String({ default: 'light' }),
          avatar: t.Union([t.String(), t.Null()], { default: null }),
          createdAt: t.Union([t.Date(), t.Null()], { default: null }),
          updatedAt: t.Union([t.Date(), t.Null()], { default: null }),
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
        theme: t.Optional(t.String()),
        avatar: t.Union([t.String(), t.Null()]),
        twoFactorEnabled: t.Optional(t.Boolean()),
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
    role: userRoleItemSchema,
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

export const updateUserRolesSchema = {
  detail: {
    tags: ['Pengguna'],
    summary: 'Perbarui banyak peran (multi-role) pengguna',
    description:
      'Mengatur satu atau beberapa peran pengguna secara bersamaan. Role Mahasiswa/Guest/Calon Mahasiswa/Super Admin bersifat eksklusif dan tidak dapat dikombinasikan dengan role lain.',
  },
  params: t.Object({
    id: t.Numeric(),
  }),
  body: t.Object({
    roles: t.Array(userRoleItemSchema),
  }),
  response: {
    200: t.Object({
      message: t.String({ default: 'Peran pengguna berhasil diperbarui' }),
      roles: t.Array(t.String({ default: 'mahasiswa' })),
    }),
    400: t.Object({
      error: t.String({ default: 'Field roles harus berupa array non-kosong' }),
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
  createdAt: t.Union([t.Date(), t.Null()], { default: null }),
  updatedAt: t.Union([t.Date(), t.Null()], { default: null }),
});

export const updateQuickMenuSchema = {
  detail: {
    tags: ['Pengguna'],
    summary: 'Perbarui Menu Cepat Pengguna',
    description: 'Menyimpan preferensi daftar akses menu cepat pengguna (maksimal 6 item).',
  },
  body: t.Object({
    quickMenu: t.Array(t.String({ minLength: 1, maxLength: 100 }), { minItems: 0, maxItems: 6 }),
  }),
};

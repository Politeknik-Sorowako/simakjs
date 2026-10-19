import { t } from 'elysia';

export const lampiranInputSchema = t.Object({
  tipe: t.Union([t.Literal('file'), t.Literal('gambar'), t.Literal('link')]),
  nama: t.String({ minLength: 1, maxLength: 255 }),
  url: t.String({ minLength: 1 }),
  ukuran: t.Optional(t.Union([t.Integer(), t.Null()])),
  mimeType: t.Optional(t.Union([t.String(), t.Null()])),
});

export const targetRoleItemSchema = t.Union([
  t.Literal('semua'),
  t.Literal('mahasiswa'),
  t.Literal('dosen'),
  t.Literal('admin'),
]);

export const saveDraftSchema = t.Object({
  id: t.Optional(t.Integer()),
  judul: t.Optional(t.String({ maxLength: 255 })),
  konten: t.Optional(t.String()),
  ringkasan: t.Optional(t.Union([t.String(), t.Null()])),
  targetRole: t.Optional(targetRoleItemSchema),
  targetRoles: t.Optional(t.Array(targetRoleItemSchema)),
  targetProdiType: t.Optional(t.Union([t.Literal('semua'), t.Literal('spesifik')])),
  targetProdiIds: t.Optional(t.Array(t.Integer())),
  targetScopeType: t.Optional(t.Union([t.Literal('umum'), t.Literal('kelas'), t.Literal('rombel')])),
  targetKelasIds: t.Optional(t.Array(t.Integer())),
  targetRombelIds: t.Optional(t.Array(t.Integer())),
  isPinned: t.Optional(t.Boolean()),
  showModalOnLogin: t.Optional(t.Boolean()),
  thumbnailUrl: t.Optional(t.Union([t.String(), t.Null()])),
  publishedAt: t.Optional(t.Union([t.String(), t.Null()])),
  expiresAt: t.Optional(t.Union([t.String(), t.Null()])),
  lampiran: t.Optional(t.Array(lampiranInputSchema)),
});

export const publishPengumumanSchema = t.Object({
  id: t.Optional(t.Integer()),
  judul: t.String({ minLength: 1, maxLength: 255 }),
  konten: t.String({ minLength: 1 }),
  ringkasan: t.Optional(t.Union([t.String(), t.Null()])),
  targetRole: t.Optional(targetRoleItemSchema),
  targetRoles: t.Optional(t.Array(targetRoleItemSchema)),
  targetProdiType: t.Union([t.Literal('semua'), t.Literal('spesifik')]),
  targetProdiIds: t.Optional(t.Array(t.Integer())),
  targetScopeType: t.Union([t.Literal('umum'), t.Literal('kelas'), t.Literal('rombel')]),
  targetKelasIds: t.Optional(t.Array(t.Integer())),
  targetRombelIds: t.Optional(t.Array(t.Integer())),
  isPinned: t.Optional(t.Boolean()),
  showModalOnLogin: t.Optional(t.Boolean()),
  thumbnailUrl: t.Optional(t.Union([t.String(), t.Null()])),
  publishMode: t.Union([t.Literal('now'), t.Literal('scheduled')]),
  scheduledPublishAt: t.Optional(t.Union([t.String(), t.Null()])),
  expiresAt: t.Optional(t.Union([t.String(), t.Null()])),
  lampiran: t.Optional(t.Array(lampiranInputSchema)),
});

export const withdrawPengumumanSchema = t.Object({
  reason: t.Optional(t.String()),
});

export const pengumumanQuerySchema = t.Object({
  search: t.Optional(t.String()),
  status: t.Optional(t.String()),
  targetRole: t.Optional(t.String()),
  page: t.Optional(t.Numeric()),
  limit: t.Optional(t.Numeric()),
});

export const pengumumanManageQuerySchema = t.Object({
  search: t.Optional(t.String()),
  status: t.Optional(t.String()),
  page: t.Optional(t.Numeric()),
  limit: t.Optional(t.Numeric()),
  sortBy: t.Optional(
    t.Union([
      t.Literal('judul'),
      t.Literal('status'),
      t.Literal('publishedAt'),
      t.Literal('createdAt'),
      t.Literal('viewCount'),
    ]),
  ),
  sortOrder: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
});

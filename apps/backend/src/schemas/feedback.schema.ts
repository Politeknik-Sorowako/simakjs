import { t } from 'elysia';

export const createFeedbackBody = t.Object({
  kategori: t.String({ default: 'usul_pengembangan' }),
  judul: t.String({ default: 'Usulan Fitur Baru' }),
  pesan: t.String({ default: 'Mohon tambahkan fitur export PDF' }),
  rating: t.Optional(t.Nullable(t.Number({ minimum: 1, maximum: 5 }))),
});

export const updateFeedbackBody = t.Partial(
  t.Object({
    kategori: t.String(),
    judul: t.String(),
    pesan: t.String(),
    rating: t.Nullable(t.Number({ minimum: 1, maximum: 5 })),
  }),
);

export const updateFeedbackStatusBody = t.Object({
  status: t.String({ default: 'in_review' }),
});

export const addCommentBody = t.Object({
  pesan: t.String(),
});

export const getAllFeedbackQuery = t.Object({
  page: t.Optional(t.Numeric()),
  limit: t.Optional(t.Numeric()),
  sortBy: t.Optional(t.String()),
  sortOrder: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
});

import { t } from 'elysia';

export const createFeedbackBody = t.Object({
  kategori: t.String({ default: 'usul_pengembangan' }),
  judul: t.String({ default: 'Usulan Fitur Baru' }),
  pesan: t.String({ default: 'Mohon tambahkan fitur export PDF' }),
  rating: t.Optional(t.Nullable(t.Number())),
});

export const updateFeedbackStatusBody = t.Object({
  status: t.String({ default: 'in_review' }),
});

import { t } from 'elysia';

export const createKategoriBimbinganSchema = {
  body: t.Object({
    nama: t.String({ minLength: 1, maxLength: 100 }),
    deskripsi: t.Optional(t.String()),
  }),
};

export const updateKategoriBimbinganSchema = {
  params: t.Object({
    id: t.Numeric(),
  }),
  body: t.Object({
    nama: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
    deskripsi: t.Optional(t.String()),
    isActive: t.Optional(t.Boolean()),
  }),
};

export const deleteKategoriBimbinganSchema = {
  params: t.Object({
    id: t.Numeric(),
  }),
};

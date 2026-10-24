import { t } from 'elysia';

export const tingkatTindakLanjutEnum = t.Union([
  t.Literal('LEVEL_1'),
  t.Literal('LEVEL_2'),
  t.Literal('LEVEL_3'),
  t.Literal('LEVEL_4'),
]);

export const statusTindakLanjutEnum = t.Union([
  t.Literal('MENUNGGU_FORM'),
  t.Literal('MENUNGGU_PERSETUJUAN'),
  t.Literal('REVISI'),
  t.Literal('SELESAI'),
  t.Literal('DIBATALKAN'),
]);

export const submitFormBody = t.Object({
  formCoaching: t.Optional(t.Record(t.String(), t.Any())),
  suratPemanggilanOrtu: t.Optional(t.Record(t.String(), t.Any())),
  beritaAcaraSidang: t.Optional(t.Record(t.String(), t.Any())),
});

export const approveBody = t.Object({
  metode: t.Union([t.Literal('TTE'), t.Literal('MANUAL')]),
  catatan: t.Optional(t.String()),
  signatureUuid: t.Optional(t.String()),
  dokumenScanUrl: t.Optional(t.String()),
});

export const rejectBody = t.Object({
  catatan: t.String({ minLength: 3 }),
});

export const batalBody = t.Object({
  alasan: t.String({ minLength: 3 }),
});

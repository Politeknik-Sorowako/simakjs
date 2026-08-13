import { t } from 'elysia';

export const verifikasiUnknownSchema = {
  body: t.Object({
    sumber: t.Union([t.Literal('BAP'), t.Literal('APEL'), t.Literal('MANUAL')], {
      error: 'Sumber harus BAP, APEL, atau MANUAL',
    }),
    sumberId: t.Numeric(),
    statusKonfirmasi: t.Union([t.Literal('SAKIT'), t.Literal('IZIN'), t.Literal('ALPA')], {
      error: 'Status konfirmasi harus SAKIT, IZIN, atau ALPA',
    }),
    durasiMenit: t.Optional(t.Number({ minimum: 0 })),
    keterangan: t.Optional(t.String()),
  }),
  response: {
    200: t.Object({
      id: t.Number(),
      mahasiswaId: t.Number(),
      tanggal: t.String(),
      sumber: t.String(),
      sumberId: t.Union([t.Number(), t.Null()]),
      status: t.String(),
      durasiMenit: t.Number(),
      keterangan: t.Union([t.String(), t.Null()]),
      isVerified: t.Boolean(),
      verifiedBy: t.Union([t.Number(), t.Null()]),
      verifiedAt: t.Union([t.Date(), t.Null()]),
    }),
    400: t.Object({ error: t.String() }),
    403: t.Object({ error: t.String() }),
    404: t.Object({ error: t.String() }),
  },
};

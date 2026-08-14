import { t } from 'elysia';

export const verifikasiUnknownSchema = {
  body: t.Object({
    sumber: t.Union([t.Literal('BAP'), t.Literal('APEL'), t.Literal('MANUAL'), t.Literal('PRAKTIKUM')], {
      error: 'Sumber harus BAP, APEL, MANUAL, atau PRAKTIKUM',
    }),
    sumberId: t.Numeric(),
    statusKonfirmasi: t.Union([t.Literal('SAKIT'), t.Literal('IZIN'), t.Literal('ALPA'), t.Literal('HADIR')], {
      error: 'Status konfirmasi harus SAKIT, IZIN, ALPA, atau HADIR',
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

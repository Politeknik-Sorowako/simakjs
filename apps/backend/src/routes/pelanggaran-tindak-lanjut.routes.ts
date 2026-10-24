import { Elysia, t } from 'elysia';
import { PelanggaranTindakLanjutController } from '../controllers/pelanggaran-tindak-lanjut.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { approveBody, batalBody, rejectBody, submitFormBody } from '../schemas/pelanggaran-tindak-lanjut.schema';

export const pelanggaranTindakLanjutRoutes = new Elysia({ prefix: '/pelanggaran/tindak-lanjut' })
  .use(authMiddleware)
  .get('/', PelanggaranTindakLanjutController.list, {
    query: t.Object({
      status: t.Optional(t.String()),
      tingkat: t.Optional(t.String()),
      periodeId: t.Optional(t.String()),
      page: t.Optional(t.String()),
      limit: t.Optional(t.String()),
    }),
  })
  .get('/:id', PelanggaranTindakLanjutController.getById, {
    params: t.Object({ id: t.String() }),
  })
  .put('/:id/form', PelanggaranTindakLanjutController.submitForm, {
    params: t.Object({ id: t.String() }),
    body: submitFormBody,
  })
  .post('/:id/approve', PelanggaranTindakLanjutController.approve, {
    params: t.Object({ id: t.String() }),
    body: approveBody,
  })
  .post('/:id/reject', PelanggaranTindakLanjutController.reject, {
    params: t.Object({ id: t.String() }),
    body: rejectBody,
  })
  .post('/:id/batal', PelanggaranTindakLanjutController.batal, {
    params: t.Object({ id: t.String() }),
    body: batalBody,
  });

import { Elysia } from 'elysia';
import { TugasAkhirController } from '../controllers/tugas-akhir.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  createTugasAkhirSchema,
  getTugasAkhirSchema,
  overrideStatusSchema,
  responUndanganSchema,
  reviewTopikSchema,
  tugasAkhirIdSchema,
  updateTugasAkhirSchema,
} from '../schemas/tugas-akhir.schema';

export const tugasAkhirRoutes = new Elysia({ prefix: '/tugas-akhir' })
  .use(authMiddleware)
  .get('/', TugasAkhirController.getAll, getTugasAkhirSchema)
  .get('/:id', TugasAkhirController.getById, tugasAkhirIdSchema)
  .post('/', TugasAkhirController.create, createTugasAkhirSchema)
  .put('/:id', TugasAkhirController.update, updateTugasAkhirSchema)
  .post('/:id/review', TugasAkhirController.reviewTopik, reviewTopikSchema)
  .post('/:id/override-status', TugasAkhirController.overrideStatus, overrideStatusSchema)
  .post('/:id/respon-undangan', TugasAkhirController.responUndangan, responUndanganSchema);

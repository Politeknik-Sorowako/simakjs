import { Elysia } from 'elysia';
import { TugasAkhirController } from '../controllers/tugas-akhir.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  accSidangSchema,
  createLogbookSchema,
  createTugasAkhirSchema,
  deleteLogbookSchema,
  getTugasAkhirSchema,
  overrideStatusSchema,
  responUndanganSchema,
  reviewLogbookSchema,
  reviewTopikSchema,
  tugasAkhirIdSchema,
  updateLogbookSchema,
  updateTugasAkhirSchema,
} from '../schemas/tugas-akhir.schema';

export const tugasAkhirRoutes = new Elysia({ prefix: '/tugas-akhir' })
  .use(authMiddleware)
  .get('/', TugasAkhirController.getAll, getTugasAkhirSchema)
  .get('/:id', TugasAkhirController.getById, tugasAkhirIdSchema)
  .post('/', TugasAkhirController.create, createTugasAkhirSchema)
  .put('/:id', TugasAkhirController.update, updateTugasAkhirSchema)
  .delete('/:id', TugasAkhirController.delete, tugasAkhirIdSchema)
  .post('/:id/review', TugasAkhirController.reviewTopik, reviewTopikSchema)
  .post('/:id/override-status', TugasAkhirController.overrideStatus, overrideStatusSchema)
  .post('/:id/respon-undangan', TugasAkhirController.responUndangan, responUndanganSchema)
  // Milestone 2: Ruang Bimbingan & Logbook TA
  .get('/:id/logbooks', TugasAkhirController.getLogbooks, tugasAkhirIdSchema)
  .post('/:id/logbooks', TugasAkhirController.createLogbook, createLogbookSchema)
  .put('/:id/logbooks/:logbookId', TugasAkhirController.updateLogbook, updateLogbookSchema)
  .delete('/:id/logbooks/:logbookId', TugasAkhirController.deleteLogbook, deleteLogbookSchema)
  .post('/:id/logbooks/:logbookId/review', TugasAkhirController.reviewLogbook, reviewLogbookSchema)
  .post('/:id/acc-sidang', TugasAkhirController.accSidang, accSidangSchema);

import { Elysia } from 'elysia';
import { EvaluasiKurikulumController } from '../controllers/evaluasi-kurikulum.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  createEvaluasiKurikulumSchema,
  deleteEvaluasiKurikulumSchema,
  getEvaluasiKurikulumByIdSchema,
  getEvaluasiKurikulumSchema,
  updateEvaluasiKurikulumSchema,
} from '../schemas/evaluasi-kurikulum.schema';

export const evaluasiKurikulumRoutes = new Elysia({ prefix: '/evaluasi-kurikulum' })
  .use(authMiddleware)
  .get('/', EvaluasiKurikulumController.getAll, getEvaluasiKurikulumSchema)
  .get('/:id', EvaluasiKurikulumController.getById, getEvaluasiKurikulumByIdSchema)
  .post('/', EvaluasiKurikulumController.create, createEvaluasiKurikulumSchema)
  .put('/:id', EvaluasiKurikulumController.update, updateEvaluasiKurikulumSchema)
  .delete('/:id', EvaluasiKurikulumController.delete, deleteEvaluasiKurikulumSchema);

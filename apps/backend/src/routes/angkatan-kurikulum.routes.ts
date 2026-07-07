import { Elysia } from 'elysia';
import { AngkatanKurikulumController } from '../controllers/angkatan-kurikulum.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  createAngkatanKurikulumSchema,
  deleteAngkatanKurikulumSchema,
  getAngkatanKurikulumAktifSchema,
  getAngkatanKurikulumSchema,
  updateAngkatanKurikulumSchema,
} from '../schemas/angkatan-kurikulum.schema';

export const angkatanKurikulumRoutes = new Elysia({ prefix: '/angkatan-kurikulum' })
  .use(authMiddleware)
  .get('/', AngkatanKurikulumController.getAll, getAngkatanKurikulumSchema)
  .get('/aktif', AngkatanKurikulumController.getAktif, getAngkatanKurikulumAktifSchema)
  .post('/', AngkatanKurikulumController.create, createAngkatanKurikulumSchema)
  .put('/:id', AngkatanKurikulumController.update, updateAngkatanKurikulumSchema)
  .delete('/:id', AngkatanKurikulumController.delete, deleteAngkatanKurikulumSchema);

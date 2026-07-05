import { Elysia } from 'elysia';
import { KurikulumController } from '../controllers/kurikulum.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  addMataKuliahSchema,
  createKurikulumSchema,
  deleteKurikulumSchema,
  getKurikulumByIdSchema,
  getKurikulumSchema,
  removeMataKuliahSchema,
  updateKurikulumSchema,
} from '../schemas/kurikulum.schema';

export const kurikulumRoutes = new Elysia({ prefix: '/kurikulum' })
  .use(authMiddleware)
  .get('/', KurikulumController.getAll, getKurikulumSchema)
  .post('/', KurikulumController.create, createKurikulumSchema)
  .get('/:id', KurikulumController.getById, getKurikulumByIdSchema)
  .put('/:id', KurikulumController.update, updateKurikulumSchema)
  .delete('/:id', KurikulumController.delete, deleteKurikulumSchema)
  .post('/:id/mata-kuliah', KurikulumController.addMataKuliah, addMataKuliahSchema)
  .delete('/:id/mata-kuliah/:mkId', KurikulumController.removeMataKuliah, removeMataKuliahSchema);

import { Elysia } from 'elysia';
import { KelasKuliahController } from '../controllers/kelas-kuliah.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  createKelasSchema,
  deleteKelasSchema,
  getKelasByIdSchema,
  getKelasSchema,
  updateKelasSchema,
} from '../schemas/kelas-kuliah.schema';

export const kelasKuliahRoutes = new Elysia({ prefix: '/kelas-kuliah' })
  .use(authMiddleware)
  .get('/', KelasKuliahController.getAll, getKelasSchema)
  .post('/', KelasKuliahController.create, createKelasSchema)
  .get('/:id', KelasKuliahController.getById, getKelasByIdSchema)
  .put('/:id', KelasKuliahController.update, updateKelasSchema)
  .delete('/:id', KelasKuliahController.delete, deleteKelasSchema);

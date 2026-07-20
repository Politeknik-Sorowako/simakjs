import { Elysia } from 'elysia';
import { KelasKuliahController } from '../controllers/kelas-kuliah.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  createKelasSchema,
  deleteKelasSchema,
  getKelasByIdSchema,
  getKelasByMkSchema,
  getKelasSchema,
  importKelasSchema,
  updateKelasSchema,
} from '../schemas/kelas-kuliah.schema';

export const kelasKuliahRoutes = new Elysia({ prefix: '/kelas-kuliah' })
  .use(authMiddleware)
  .get('/', KelasKuliahController.getAll, getKelasSchema)
  .post('/', KelasKuliahController.create, createKelasSchema)
  .post('/import', KelasKuliahController.importCsv, importKelasSchema)
  .get('/by-mk', KelasKuliahController.getByMk, getKelasByMkSchema)
  .get('/:id', KelasKuliahController.getById, getKelasByIdSchema)
  .put('/:id', KelasKuliahController.update, updateKelasSchema)
  .delete('/:id', KelasKuliahController.delete, deleteKelasSchema);

import { Elysia } from 'elysia';
import { KelasKuliahController } from '../controllers/kelas-kuliah.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  createKelasSchema,
  deleteKelasSchema,
  getKelasByIdSchema,
  getKelasByMkSchema,
  getKelasSchema,
  getTemplateKelasSchema,
  importKelasSchema,
  updateKelasSchema,
} from '../schemas/kelas-kuliah.schema';

export const kelasKuliahRoutes = new Elysia({ prefix: '/kelas-kuliah' })
  .use(authMiddleware)
  .get('/', KelasKuliahController.getAll, getKelasSchema)
  .get('/my-classes', KelasKuliahController.myClasses, getKelasSchema)
  .post('/', KelasKuliahController.create, createKelasSchema)
  .get('/by-mk', KelasKuliahController.getByMk, getKelasByMkSchema)
  .post('/import', KelasKuliahController.import, importKelasSchema)
  .get('/template/csv', KelasKuliahController.getTemplate, getTemplateKelasSchema)
  .get('/:id', KelasKuliahController.getById, getKelasByIdSchema)
  .put('/:id', KelasKuliahController.update, updateKelasSchema)
  .delete('/:id', KelasKuliahController.delete, deleteKelasSchema);

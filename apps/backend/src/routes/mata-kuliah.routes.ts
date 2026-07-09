import { Elysia } from 'elysia';
import { MataKuliahController } from '../controllers/mata-kuliah.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  createMataKuliahSchema,
  deleteMataKuliahSchema,
  getMataKuliahByIdSchema,
  getMataKuliahSchema,
  importMataKuliahSchema,
  updateMataKuliahSchema,
} from '../schemas/mata-kuliah.schema';

export const mataKuliahRoutes = new Elysia({ prefix: '/mata-kuliah' })
  .use(authMiddleware)
  .get('/', MataKuliahController.getAll, getMataKuliahSchema)
  .post('/', MataKuliahController.create, createMataKuliahSchema)
  .post('/import', MataKuliahController.importCsv, importMataKuliahSchema)
  .get('/:id', MataKuliahController.getById, getMataKuliahByIdSchema)
  .put('/:id', MataKuliahController.update, updateMataKuliahSchema)
  .delete('/:id', MataKuliahController.delete, deleteMataKuliahSchema);

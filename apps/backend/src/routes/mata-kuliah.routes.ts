import { Elysia } from 'elysia';
import { MataKuliahController } from '../controllers/mata-kuliah.controller';
import {
  getMataKuliahSchema,
  createMataKuliahSchema,
  getMataKuliahByIdSchema,
  updateMataKuliahSchema,
  deleteMataKuliahSchema
} from '../schemas/mata-kuliah.schema';
import { authMiddleware } from '../middlewares/auth.middleware';

export const mataKuliahRoutes = new Elysia({ prefix: '/mata-kuliah' })
  .use(authMiddleware)
  .get('/', MataKuliahController.getAll, getMataKuliahSchema)
  .post('/', MataKuliahController.create, createMataKuliahSchema)
  .get('/:id', MataKuliahController.getById, getMataKuliahByIdSchema)
  .put('/:id', MataKuliahController.update, updateMataKuliahSchema)
  .delete('/:id', MataKuliahController.delete, deleteMataKuliahSchema);

import { Elysia } from 'elysia';
import { CpmkController } from '../controllers/cpmk.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  createCpmkSchema,
  deleteCpmkSchema,
  getAllCpmkSchema,
  getCpmkByIdSchema,
  getCpmkByMataKuliahSchema,
  updateCpmkSchema,
} from '../schemas/cpmk.schema';

export const cpmkRoutes = new Elysia({ prefix: '/cpmk' })
  .use(authMiddleware)
  .get('/', CpmkController.getAll, getAllCpmkSchema)
  .get('/mata-kuliah/:mataKuliahId', CpmkController.getByMataKuliah, getCpmkByMataKuliahSchema)
  .get('/:id', CpmkController.getById, getCpmkByIdSchema)
  .post('/', CpmkController.create, createCpmkSchema)
  .put('/:id', CpmkController.update, updateCpmkSchema)
  .delete('/:id', CpmkController.delete, deleteCpmkSchema);

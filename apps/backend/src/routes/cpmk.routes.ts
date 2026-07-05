import { Elysia } from 'elysia';
import { CpmkController } from '../controllers/cpmk.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { createCpmkSchema, deleteCpmkSchema, getCpmkByMataKuliahSchema } from '../schemas/cpmk.schema';

export const cpmkRoutes = new Elysia({ prefix: '/cpmk' })
  .use(authMiddleware)
  .get('/mata-kuliah/:mataKuliahId', CpmkController.getByMataKuliah, getCpmkByMataKuliahSchema)
  .post('/', CpmkController.create, createCpmkSchema)
  .delete('/:id', CpmkController.delete, deleteCpmkSchema);

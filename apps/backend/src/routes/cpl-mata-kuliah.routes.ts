import { Elysia } from 'elysia';
import { CplMataKuliahController } from '../controllers/cpl-mata-kuliah.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  createCplMataKuliahSchema,
  deleteCplMataKuliahSchema,
  getCplMataKuliahMatriksSchema,
  getCplMataKuliahSchema,
  updateCplMataKuliahSchema,
  validateCplMataKuliahBobotSchema,
} from '../schemas/cpl-mata-kuliah.schema';

export const cplMataKuliahRoutes = new Elysia({ prefix: '/cpl-mata-kuliah' })
  .use(authMiddleware)
  .get('/', CplMataKuliahController.getAll, getCplMataKuliahSchema)
  .get('/matriks', CplMataKuliahController.getMatriks, getCplMataKuliahMatriksSchema)
  .get('/validate-bobot', CplMataKuliahController.validateBobot, validateCplMataKuliahBobotSchema)
  .post('/', CplMataKuliahController.create, createCplMataKuliahSchema)
  .put('/:id', CplMataKuliahController.update, updateCplMataKuliahSchema)
  .delete('/:id', CplMataKuliahController.delete, deleteCplMataKuliahSchema);

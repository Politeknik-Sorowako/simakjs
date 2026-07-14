import { Elysia } from 'elysia';
import { CplController } from '../controllers/cpl.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  createCplSchema,
  deleteCplSchema,
  getCplByIdSchema,
  getCplSchema,
  importCplSchema,
  updateCplSchema,
} from '../schemas/cpl.schema';

export const cplRoutes = new Elysia({ prefix: '/cpl' })
  .use(authMiddleware)
  .get('/', CplController.getAll, getCplSchema)
  .get('/:id', CplController.getById, getCplByIdSchema)
  .post('/', CplController.create, createCplSchema)
  .post('/import', CplController.import, importCplSchema)
  .put('/:id', CplController.update, updateCplSchema)
  .delete('/:id', CplController.delete, deleteCplSchema);

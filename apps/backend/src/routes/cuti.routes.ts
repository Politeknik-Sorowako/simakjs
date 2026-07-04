import { Elysia } from 'elysia';
import { CutiController } from '../controllers/cuti.controller';
import {
  createCutiSchema,
  getCutiSchema,
  approveCutiSchema,
  deleteCutiSchema
} from '../schemas/cuti.schema';
import { authMiddleware } from '../middlewares/auth.middleware';

export const cutiRoutes = new Elysia({ prefix: '/cuti' })
  .use(authMiddleware)
  .post('/', CutiController.create, createCutiSchema)
  .get('/', CutiController.getAll, getCutiSchema)
  .get('/:id', CutiController.getById)
  .put('/:id/approve', CutiController.approve, approveCutiSchema)
  .delete('/:id', CutiController.delete, deleteCutiSchema);

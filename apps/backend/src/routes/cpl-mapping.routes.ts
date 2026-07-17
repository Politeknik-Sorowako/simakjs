import { Elysia } from 'elysia';
import { CplMappingController } from '../controllers/cpl-mapping.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  createCplMappingSchema,
  deleteCplMappingSchema,
  getCplMappingSchema,
  getCplMatriksSchema,
} from '../schemas/cpl-mapping.schema';

export const cplMappingRoutes = new Elysia({ prefix: '/cpl-mapping' })
  .use(authMiddleware)
  .get('/', CplMappingController.getAll, getCplMappingSchema)
  .get('/matriks', CplMappingController.getMatriks, getCplMatriksSchema)
  .post('/', CplMappingController.create, createCplMappingSchema)
  .delete('/:id', CplMappingController.delete, deleteCplMappingSchema);

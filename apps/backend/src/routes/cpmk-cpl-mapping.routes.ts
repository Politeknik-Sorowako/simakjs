import { Elysia } from 'elysia';
import { CpmkCplMappingController } from '../controllers/cpmk-cpl-mapping.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  createCpmkCplMappingSchema,
  deleteCpmkCplMappingSchema,
  getCpmkCplMappingSchema,
  getCpmkCplMatriksSchema,
} from '../schemas/cpmk-cpl-mapping.schema';

export const cpmkCplMappingRoutes = new Elysia({ prefix: '/cpmk-cpl-mapping' })
  .use(authMiddleware)
  .get('/', CpmkCplMappingController.getAll, getCpmkCplMappingSchema)
  .get('/matriks', CpmkCplMappingController.getMatriks, getCpmkCplMatriksSchema)
  .post('/', CpmkCplMappingController.create, createCpmkCplMappingSchema)
  .delete('/:id', CpmkCplMappingController.delete, deleteCpmkCplMappingSchema);

import { Elysia } from 'elysia';
import { BahanKajianCplMappingController } from '../controllers/bahan-kajian-cpl-mapping.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  createBahanKajianCplMappingSchema,
  deleteBahanKajianCplMappingSchema,
  getBahanKajianCplMappingSchema,
  getBahanKajianCplMatriksSchema,
} from '../schemas/bahan-kajian-cpl-mapping.schema';

export const bahanKajianCplMappingRoutes = new Elysia({ prefix: '/bahan-kajian-cpl-mapping' })
  .use(authMiddleware)
  .get('/', BahanKajianCplMappingController.getAll, getBahanKajianCplMappingSchema)
  .get('/matriks', BahanKajianCplMappingController.getMatriks, getBahanKajianCplMatriksSchema)
  .post('/', BahanKajianCplMappingController.create, createBahanKajianCplMappingSchema)
  .delete('/:id', BahanKajianCplMappingController.delete, deleteBahanKajianCplMappingSchema);

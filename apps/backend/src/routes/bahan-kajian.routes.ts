import { Elysia } from 'elysia';
import { BahanKajianController } from '../controllers/bahan-kajian.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  createBahanKajianSchema,
  deleteBahanKajianSchema,
  getBahanKajianByIdSchema,
  getBahanKajianSchema,
  importBahanKajianSchema,
  updateBahanKajianSchema,
} from '../schemas/bahan-kajian.schema';

export const bahanKajianRoutes = new Elysia({ prefix: '/bahan-kajian' })
  .use(authMiddleware)
  .get('/', BahanKajianController.getAll, getBahanKajianSchema)
  .get('/template', BahanKajianController.getTemplate)
  .get('/:id', BahanKajianController.getById, getBahanKajianByIdSchema)
  .post('/', BahanKajianController.create, createBahanKajianSchema)
  .post('/import', BahanKajianController.import, importBahanKajianSchema)
  .put('/:id', BahanKajianController.update, updateBahanKajianSchema)
  .delete('/:id', BahanKajianController.delete, deleteBahanKajianSchema);

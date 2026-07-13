import { Elysia } from 'elysia';
import { SubCpmkController } from '../controllers/sub-cpmk.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  createSubCpmkSchema,
  deleteSubCpmkSchema,
  getSubCpmkByIdSchema,
  getSubCpmkSchema,
  updateSubCpmkSchema,
} from '../schemas/sub-cpmk.schema';

export const subCpmkRoutes = new Elysia({ prefix: '/sub-cpmk' })
  .use(authMiddleware)
  .get('/', SubCpmkController.getByCpmk, getSubCpmkSchema)
  .get('/:id', SubCpmkController.getById, getSubCpmkByIdSchema)
  .post('/', SubCpmkController.create, createSubCpmkSchema)
  .put('/:id', SubCpmkController.update, updateSubCpmkSchema)
  .delete('/:id', SubCpmkController.delete, deleteSubCpmkSchema);

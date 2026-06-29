import { Elysia } from 'elysia';
import { ProdiController } from '../controllers/prodi.controller';
import {
  getProdiSchema,
  createProdiSchema,
  getProdiByIdSchema,
  updateProdiSchema,
  deleteProdiSchema
} from '../schemas/prodi.schema';
import { authMiddleware } from '../middlewares/auth.middleware';

export const prodiRoutes = new Elysia({ prefix: '/prodi' })
  .use(authMiddleware)
  .get('/', ProdiController.getAll, getProdiSchema)
  .post('/', ProdiController.create, createProdiSchema)
  .post('/import', ProdiController.importCsv)
  .get('/:id', ProdiController.getById, getProdiByIdSchema)
  .put('/:id', ProdiController.update, updateProdiSchema)
  .delete('/:id', ProdiController.delete, deleteProdiSchema);

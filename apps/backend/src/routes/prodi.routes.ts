import { Elysia } from 'elysia';
import { ProdiController } from '../controllers/prodi.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  createProdiSchema,
  deleteProdiSchema,
  getProdiByIdSchema,
  getProdiSchema,
  importProdiSchema,
  updateProdiSchema,
  uploadSkSchema,
} from '../schemas/prodi.schema';

export const prodiRoutes = new Elysia({ prefix: '/prodi' })
  .use(authMiddleware)
  .get('/', ProdiController.getAll, getProdiSchema)
  .post('/', ProdiController.create, createProdiSchema)
  .post('/import', ProdiController.importCsv, importProdiSchema)
  .post('/upload-sk', ProdiController.uploadSk, uploadSkSchema)
  .get('/:id', ProdiController.getById, getProdiByIdSchema)
  .put('/:id', ProdiController.update, updateProdiSchema)
  .delete('/:id', ProdiController.delete, deleteProdiSchema);

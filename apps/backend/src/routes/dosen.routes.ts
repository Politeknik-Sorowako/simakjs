import { Elysia } from 'elysia';
import { DosenController } from '../controllers/dosen.controller';
import {
  getDosenSchema,
  createDosenSchema,
  getDosenByIdSchema,
  updateDosenSchema,
  deleteDosenSchema
} from '../schemas/dosen.schema';
import { authMiddleware } from '../middlewares/auth.middleware';

export const dosenRoutes = new Elysia({ prefix: '/dosen' })
  .use(authMiddleware)
  .get('/', DosenController.getAll, getDosenSchema)
  .post('/', DosenController.create, createDosenSchema)
  .post('/import', DosenController.importCsv)
  .get('/:id', DosenController.getById, getDosenByIdSchema)
  .put('/:id', DosenController.update, updateDosenSchema)
  .delete('/:id', DosenController.delete, deleteDosenSchema);

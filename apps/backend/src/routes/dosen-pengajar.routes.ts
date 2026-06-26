import { Elysia } from 'elysia';
import { DosenPengajarController } from '../controllers/dosen-pengajar.controller';
import {
  getDosenPengajarSchema,
  createDosenPengajarSchema,
  deleteDosenPengajarSchema
} from '../schemas/dosen-pengajar.schema';
import { authMiddleware } from '../middlewares/auth.middleware';

export const dosenPengajarRoutes = new Elysia({ prefix: '/dosen-pengajar' })
  .use(authMiddleware)
  .get('/', DosenPengajarController.getAll, getDosenPengajarSchema)
  .post('/', DosenPengajarController.create, createDosenPengajarSchema)
  .delete('/:id', DosenPengajarController.delete, deleteDosenPengajarSchema);

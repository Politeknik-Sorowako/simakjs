import { Elysia } from 'elysia';
import { DosenPengajarController } from '../controllers/dosen-pengajar.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  createDosenPengajarSchema,
  deleteDosenPengajarSchema,
  getDosenPengajarSchema,
} from '../schemas/dosen-pengajar.schema';

export const dosenPengajarRoutes = new Elysia({ prefix: '/dosen-pengajar' })
  .use(authMiddleware)
  .get('/', DosenPengajarController.getAll, getDosenPengajarSchema)
  .post('/', DosenPengajarController.create, createDosenPengajarSchema)
  .delete('/:id', DosenPengajarController.delete, deleteDosenPengajarSchema);

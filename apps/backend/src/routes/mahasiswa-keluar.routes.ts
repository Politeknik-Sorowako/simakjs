import { Elysia } from 'elysia';
import { MahasiswaKeluarController } from '../controllers/mahasiswa-keluar.controller';
import {
  createMahasiswaKeluarSchema,
  getMahasiswaKeluarSchema,
  deleteMahasiswaKeluarSchema
} from '../schemas/mahasiswa-keluar.schema';
import { authMiddleware } from '../middlewares/auth.middleware';

export const mahasiswaKeluarRoutes = new Elysia({ prefix: '/mahasiswa-keluar' })
  .use(authMiddleware)
  .post('/', MahasiswaKeluarController.create, createMahasiswaKeluarSchema)
  .get('/', MahasiswaKeluarController.getAll, getMahasiswaKeluarSchema)
  .delete('/:id', MahasiswaKeluarController.delete, deleteMahasiswaKeluarSchema);

import { Elysia } from 'elysia';
import { MahasiswaKeluarController } from '../controllers/mahasiswa-keluar.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  createMahasiswaKeluarSchema,
  deleteMahasiswaKeluarSchema,
  getMahasiswaKeluarSchema,
} from '../schemas/mahasiswa-keluar.schema';

export const mahasiswaKeluarRoutes = new Elysia({ prefix: '/mahasiswa-keluar' })
  .use(authMiddleware)
  .post('/', MahasiswaKeluarController.create, createMahasiswaKeluarSchema)
  .get('/', MahasiswaKeluarController.getAll, getMahasiswaKeluarSchema)
  .get('/stats', MahasiswaKeluarController.getStats)
  .delete('/:id', MahasiswaKeluarController.delete, deleteMahasiswaKeluarSchema);

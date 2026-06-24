import { Elysia } from 'elysia';
import { MahasiswaController } from '../controllers/mahasiswa.controller';
import { getMahasiswaSchema, createMahasiswaSchema } from '../schemas/mahasiswa.schema';
import { authMiddleware } from '../middlewares/auth.middleware';

export const mahasiswaRoutes = new Elysia({ prefix: '/mahasiswa' })
  .use(authMiddleware)
  .get('/', MahasiswaController.getAll, getMahasiswaSchema)
  .post('/', MahasiswaController.create, createMahasiswaSchema);

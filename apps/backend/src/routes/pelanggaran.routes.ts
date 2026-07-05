import { Elysia } from 'elysia';
import { PelanggaranController } from '../controllers/pelanggaran.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  createPelanggaranSchema,
  getAllPelanggaranSchema,
  getPelanggaranMahasiswaSchema,
  updatePelanggaranSchema,
} from '../schemas/pelanggaran.schema';

export const pelanggaranRoutes = new Elysia({ prefix: '/pelanggaran' })
  .use(authMiddleware)
  .post('/', PelanggaranController.create, createPelanggaranSchema)
  .get('/mahasiswa/:mhsId', PelanggaranController.getByMhsId, getPelanggaranMahasiswaSchema)
  .get('/', PelanggaranController.getAll, getAllPelanggaranSchema)
  .put('/:id', PelanggaranController.update, updatePelanggaranSchema);

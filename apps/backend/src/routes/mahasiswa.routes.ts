import { Elysia } from 'elysia';
import { MahasiswaController } from '../controllers/mahasiswa.controller';
import {
  getMahasiswaSchema,
  createMahasiswaSchema,
  getMahasiswaByIdSchema,
  updateMahasiswaSchema,
  deleteMahasiswaSchema
} from '../schemas/mahasiswa.schema';
import { authMiddleware } from '../middlewares/auth.middleware';

export const mahasiswaRoutes = new Elysia({ prefix: '/mahasiswa' })
  .use(authMiddleware)
  .get('/', MahasiswaController.getAll, getMahasiswaSchema)
  .post('/', MahasiswaController.create, createMahasiswaSchema)
  .post('/import', MahasiswaController.importCsv)
  .post('/import-pa', MahasiswaController.importPaCsv)
  .get('/:id', MahasiswaController.getById, getMahasiswaByIdSchema)
  .put('/:id', MahasiswaController.update, updateMahasiswaSchema)
  .delete('/:id', MahasiswaController.delete, deleteMahasiswaSchema);

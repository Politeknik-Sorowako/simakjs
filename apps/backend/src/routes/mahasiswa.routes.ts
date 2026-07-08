import { Elysia } from 'elysia';
import { MahasiswaController } from '../controllers/mahasiswa.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  createMahasiswaSchema,
  deleteMahasiswaSchema,
  getMahasiswaByIdSchema,
  getMahasiswaSchema,
  updateMahasiswaSchema,
} from '../schemas/mahasiswa.schema';

export const mahasiswaRoutes = new Elysia({ prefix: '/mahasiswa' })
  .use(authMiddleware)
  .get('/', MahasiswaController.getAll, getMahasiswaSchema)
  .get('/stats', MahasiswaController.getStats)
  .get('/baru', MahasiswaController.getMahasiswaBaru)
  .post('/', MahasiswaController.create, createMahasiswaSchema)
  .post('/import', MahasiswaController.importCsv)
  .post('/import-pa', MahasiswaController.importPaCsv)
  .get('/:id', MahasiswaController.getById, getMahasiswaByIdSchema)
  .put('/:id', MahasiswaController.update, updateMahasiswaSchema)
  .delete('/:id', MahasiswaController.delete, deleteMahasiswaSchema);

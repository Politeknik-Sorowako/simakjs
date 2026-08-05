import { Elysia } from 'elysia';
import { MahasiswaController } from '../controllers/mahasiswa.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  bulkSetDosenPaSchema,
  createMahasiswaSchema,
  deleteMahasiswaSchema,
  getMahasiswaBaruSchema,
  getMahasiswaByIdSchema,
  getMahasiswaSchema,
  getMahasiswaStatsSchema,
  importMahasiswaSchema,
  importPaMahasiswaSchema,
  updateMahasiswaSchema,
} from '../schemas/mahasiswa.schema';

export const mahasiswaRoutes = new Elysia({ prefix: '/mahasiswa' })
  .use(authMiddleware)
  .get('/', MahasiswaController.getAll, getMahasiswaSchema)
  .get('/stats', MahasiswaController.getStats, getMahasiswaStatsSchema)
  .get('/baru', MahasiswaController.getMahasiswaBaru, getMahasiswaBaruSchema)
  .post('/', MahasiswaController.create, createMahasiswaSchema)
  .post('/import', MahasiswaController.importCsv, importMahasiswaSchema)
  .post('/import-pa', MahasiswaController.importPaCsv, importPaMahasiswaSchema)
  .put('/bulk-set-dosen-pa', MahasiswaController.bulkSetDosenPa, bulkSetDosenPaSchema)
  .get('/:id', MahasiswaController.getById, getMahasiswaByIdSchema)
  .put('/:id', MahasiswaController.update, updateMahasiswaSchema)
  .delete('/:id', MahasiswaController.delete, deleteMahasiswaSchema);

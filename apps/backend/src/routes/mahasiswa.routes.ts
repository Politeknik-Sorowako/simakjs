import { Elysia } from 'elysia';
import { MahasiswaController } from '../controllers/mahasiswa.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  bulkSetDosenPaSchema,
  bulkUploadFotoSchema,
  createMahasiswaSchema,
  deleteMahasiswaSchema,
  getFotoMahasiswaSchema,
  getMahasiswaBaruSchema,
  getMahasiswaByIdSchema,
  getMahasiswaSchema,
  getMahasiswaStatsSchema,
  importMahasiswaSchema,
  importPaMahasiswaSchema,
  updateMahasiswaSchema,
  uploadFotoMahasiswaSchema,
} from '../schemas/mahasiswa.schema';

export const mahasiswaRoutes = new Elysia({ prefix: '/mahasiswa' })
  .use(authMiddleware)
  .get('/', MahasiswaController.getAll, getMahasiswaSchema)
  .get('/stats', MahasiswaController.getStats, getMahasiswaStatsSchema)
  .get('/baru', MahasiswaController.getMahasiswaBaru, getMahasiswaBaruSchema)
  .post('/', MahasiswaController.create, createMahasiswaSchema)
  .post('/import', MahasiswaController.importCsv, importMahasiswaSchema)
  .post('/import-pa', MahasiswaController.importPaCsv, importPaMahasiswaSchema)
  .post('/bulk-foto', MahasiswaController.bulkUploadFoto, bulkUploadFotoSchema)
  .put('/bulk-set-dosen-pa', MahasiswaController.bulkSetDosenPa, bulkSetDosenPaSchema)
  .get('/:id', MahasiswaController.getById, getMahasiswaByIdSchema)
  .get('/:id/foto', MahasiswaController.getFoto, getFotoMahasiswaSchema)
  .post('/:id/foto', MahasiswaController.uploadFoto, uploadFotoMahasiswaSchema)
  .put('/:id', MahasiswaController.update, updateMahasiswaSchema)
  .delete('/:id', MahasiswaController.delete, deleteMahasiswaSchema);

import { Elysia } from 'elysia';
import { PembimbingController } from '../controllers/pembimbing.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  bulkSetPembimbingSchema,
  getImporPembimbingSchema,
  getPembimbingMahasiswaSchema,
  getPembimbingSchema,
  nonaktifkanPembimbingSchema,
  setPembimbingSchema,
} from '../schemas/pembimbing.schema';

export const pembimbingRoutes = new Elysia({ prefix: '/pembimbing' })
  .use(authMiddleware)
  .get('/', PembimbingController.getAll, getPembimbingSchema)
  .get('/mahasiswa/:mahasiswaId', PembimbingController.getByMahasiswa, getPembimbingMahasiswaSchema)
  .post('/', PembimbingController.set, setPembimbingSchema)
  .post('/bulk', PembimbingController.bulkSet, bulkSetPembimbingSchema)
  .post('/import', PembimbingController.importCsv, getImporPembimbingSchema)
  .patch('/:id/nonaktifkan', PembimbingController.nonaktifkan, nonaktifkanPembimbingSchema);

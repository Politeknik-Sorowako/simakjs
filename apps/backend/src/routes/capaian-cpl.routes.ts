import { Elysia } from 'elysia';
import { CapaianCplController } from '../controllers/capaian-cpl.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  getCapaianCplByMahasiswaSchema,
  getCapaianCplRekapSchema,
  hitungBatchCapaianCplSchema,
} from '../schemas/capaian-cpl.schema';

export const capaianCplRoutes = new Elysia({ prefix: '/capaian-cpl' })
  .use(authMiddleware)
  .get('/mahasiswa/:mahasiswaId', CapaianCplController.getByMahasiswa, getCapaianCplByMahasiswaSchema)
  .get('/rekap', CapaianCplController.getRekap, getCapaianCplRekapSchema)
  .post('/hitung-batch', CapaianCplController.hitungBatch, hitungBatchCapaianCplSchema);

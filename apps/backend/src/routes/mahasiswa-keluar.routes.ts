import { Elysia } from 'elysia';
import { MahasiswaKeluarController } from '../controllers/mahasiswa-keluar.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  createMahasiswaKeluarSchema,
  deleteMahasiswaKeluarSchema,
  getMahasiswaKeluarSchema,
  getMahasiswaKeluarStatsSchema,
  lampiranKeluarParamsSchema,
  listLampiranKeluarSchema,
  updateMahasiswaKeluarSchema,
  uploadLampiranKeluarSchema,
} from '../schemas/mahasiswa-keluar.schema';

export const mahasiswaKeluarRoutes = new Elysia({ prefix: '/mahasiswa-keluar' })
  .use(authMiddleware)
  .post('/', MahasiswaKeluarController.create, createMahasiswaKeluarSchema)
  .get('/', MahasiswaKeluarController.getAll, getMahasiswaKeluarSchema)
  .get('/stats', MahasiswaKeluarController.getStats, getMahasiswaKeluarStatsSchema)
  .put('/:id', MahasiswaKeluarController.update, updateMahasiswaKeluarSchema)
  .get('/:id/lampiran', MahasiswaKeluarController.listLampiran, listLampiranKeluarSchema)
  .post('/:id/lampiran', MahasiswaKeluarController.uploadLampiran, uploadLampiranKeluarSchema)
  .get('/:id/lampiran/:lampiranId/file', MahasiswaKeluarController.downloadLampiran, lampiranKeluarParamsSchema)
  .delete('/:id/lampiran/:lampiranId', MahasiswaKeluarController.deleteLampiran, lampiranKeluarParamsSchema)
  .delete('/:id', MahasiswaKeluarController.delete, deleteMahasiswaKeluarSchema);

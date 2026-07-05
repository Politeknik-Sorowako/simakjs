import { Elysia } from 'elysia';
import { BimbinganController } from '../controllers/bimbingan.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  createBimbinganThreadSchema,
  getBimbinganMonitoringSchema,
  getBimbinganSchema,
  updateBimbinganSchema,
} from '../schemas/bimbingan.schema';

export const bimbinganRoutes = new Elysia({ prefix: '/bimbingan' })
  .use(authMiddleware)
  .get('/monitoring', BimbinganController.getMonitoring, getBimbinganMonitoringSchema)
  .get('/rekap-bkd', BimbinganController.getRekapBkd)
  .get('/mahasiswa/:mhsId', BimbinganController.getByMhsId, getBimbinganSchema)
  .get('/mahasiswa/:mhsId/akademik-summary', BimbinganController.getAkademikSummary)
  .post('/mahasiswa/:mhsId/thread', BimbinganController.createThreadMessage, createBimbinganThreadSchema)
  .delete('/mahasiswa/:mhsId/thread', BimbinganController.clearChat)
  .post('/mahasiswa/:mhsId/sesi', BimbinganController.addSesi)
  .put('/sesi/:sesiId', BimbinganController.updateSesi)
  .delete('/sesi/:sesiId', BimbinganController.deleteSesi)
  .put('/mahasiswa/:mhsId', BimbinganController.updateBimbingan, updateBimbinganSchema);

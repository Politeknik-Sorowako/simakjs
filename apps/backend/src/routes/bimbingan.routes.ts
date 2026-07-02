import { Elysia } from 'elysia';
import { BimbinganController } from '../controllers/bimbingan.controller';
import {
  getBimbinganSchema,
  createBimbinganThreadSchema,
  updateBimbinganSchema,
  getBimbinganMonitoringSchema
} from '../schemas/bimbingan.schema';
import { authMiddleware } from '../middlewares/auth.middleware';

export const bimbinganRoutes = new Elysia({ prefix: '/bimbingan' })
  .use(authMiddleware)
  .get('/monitoring', BimbinganController.getMonitoring, getBimbinganMonitoringSchema)
  .get('/rekap-bkd', BimbinganController.getRekapBkd)
  .get('/mahasiswa/:mhsId', BimbinganController.getByMhsId, getBimbinganSchema)
  .post('/mahasiswa/:mhsId/thread', BimbinganController.createThreadMessage, createBimbinganThreadSchema)
  .put('/mahasiswa/:mhsId', BimbinganController.updateBimbingan, updateBimbinganSchema);

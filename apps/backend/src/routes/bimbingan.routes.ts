import { Elysia } from 'elysia';
import { BimbinganController } from '../controllers/bimbingan.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  addSesiSchema,
  clearChatSchema,
  createBimbinganThreadSchema,
  deleteSesiSchema,
  getAkademikSummarySchema,
  getBimbinganMonitoringSchema,
  getBimbinganSchema,
  getRekapBkdSchema,
  updateBimbinganSchema,
  updateSesiSchema,
} from '../schemas/bimbingan.schema';

export const bimbinganRoutes = new Elysia({ prefix: '/bimbingan' })
  .use(authMiddleware)
  .get('/monitoring', BimbinganController.getMonitoring, getBimbinganMonitoringSchema)
  .get('/rekap-bkd', BimbinganController.getRekapBkd, getRekapBkdSchema)
  .get('/mahasiswa/:mhsId', BimbinganController.getByMhsId, getBimbinganSchema)
  .get('/mahasiswa/:mhsId/akademik-summary', BimbinganController.getAkademikSummary, getAkademikSummarySchema)
  .post('/mahasiswa/:mhsId/thread', BimbinganController.createThreadMessage, createBimbinganThreadSchema)
  .delete('/mahasiswa/:mhsId/thread', BimbinganController.clearChat, clearChatSchema)
  .post('/mahasiswa/:mhsId/sesi', BimbinganController.addSesi, addSesiSchema)
  .put('/sesi/:sesiId', BimbinganController.updateSesi, updateSesiSchema)
  .delete('/sesi/:sesiId', BimbinganController.deleteSesi, deleteSesiSchema)
  .put('/mahasiswa/:mhsId', BimbinganController.updateBimbingan, updateBimbinganSchema);

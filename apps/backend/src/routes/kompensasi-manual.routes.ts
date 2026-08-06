import { Elysia } from 'elysia';
import { KompensasiManualController } from '../controllers/kompensasi-manual.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  createKompensasiManualSchema,
  deleteKompensasiManualSchema,
  getAllKompensasiManualSchema,
  getDuplicateRiskSchema,
  getKompensasiManualStatsSchema,
  getRiwayatKompensasiManualSchema,
  updateKompensasiManualSchema,
} from '../schemas/kompensasi-manual.schema';

export const kompensasiManualRoutes = new Elysia({ prefix: '/kompensasi-manual' })
  .use(authMiddleware)
  .get('/', KompensasiManualController.getAll, getAllKompensasiManualSchema)
  .get('/riwayat/:mahasiswaId', KompensasiManualController.getRiwayat, getRiwayatKompensasiManualSchema)
  .get('/duplicate-risk', KompensasiManualController.getDuplicateRisk, getDuplicateRiskSchema)
  .get('/stats', KompensasiManualController.getStats, getKompensasiManualStatsSchema)
  .post('/', KompensasiManualController.createKompensasi, createKompensasiManualSchema)
  .put('/:id', KompensasiManualController.updateKompensasi, updateKompensasiManualSchema)
  .delete('/:id', KompensasiManualController.deleteKompensasi, deleteKompensasiManualSchema);

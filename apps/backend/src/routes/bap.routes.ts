import { Elysia } from 'elysia';
import { BapController } from '../controllers/bap.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  createBapSchema,
  getBapByKelasSchema,
  getMonitoringRpsDetailSchema,
  getMonitoringRpsSchema,
  getRpsTopikByKelasSchema,
  updateBapBulkSchema,
  updateBapSchema,
} from '../schemas/bap.schema';

export const bapRoutes = new Elysia({ prefix: '/bap' })
  .use(authMiddleware)
  .get('/kelas/:kelasKuliahId', BapController.getByKelas, getBapByKelasSchema)
  .get('/kelas/:kelasKuliahId/topik', BapController.getRpsTopik, getRpsTopikByKelasSchema)
  .get('/monitoring-rps', BapController.getMonitoringRps, getMonitoringRpsSchema)
  .get('/monitoring-rps/kelas/:kelasKuliahId', BapController.getMonitoringRpsDetail, getMonitoringRpsDetailSchema)
  .post('/', BapController.create, createBapSchema)
  .put('/bulk', BapController.updateBapBulk, updateBapBulkSchema)
  .put('/:id', BapController.update, updateBapSchema);

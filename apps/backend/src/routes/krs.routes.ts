import { Elysia } from 'elysia';
import { KrsController } from '../controllers/krs.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  approveBatchKrsSchema,
  approveKrsSchema,
  createKrsSchema,
  deleteKrsSchema,
  getKrsByIdSchema,
  getKrsSchema,
  getKrsStatsSchema,
  getPendingStudentsSchema,
  getRencanaStudiSchema,
  importKrsSchema,
  updateKrsSchema,
  validasiKrsSchema,
} from '../schemas/krs.schema';

export const krsRoutes = new Elysia({ prefix: '/krs' })
  .use(authMiddleware)
  .get('/', KrsController.getAll, getKrsSchema)
  .post('/', KrsController.create, createKrsSchema)
  .post('/approve', KrsController.approve, approveKrsSchema)
  .get('/pending-students', KrsController.getPendingStudents, getPendingStudentsSchema)
  .post('/approve-batch', KrsController.approveBatch, approveBatchKrsSchema)
  .get('/rencana-studi', KrsController.getRencanaStudi, getRencanaStudiSchema)
  .get('/validasi', KrsController.validasiKrs, validasiKrsSchema)
  .get('/stats', KrsController.getStats, getKrsStatsSchema)
  .post('/import', KrsController.importCsv, importKrsSchema)
  .get('/:id', KrsController.getById, getKrsByIdSchema)
  .put('/:id', KrsController.update, updateKrsSchema)
  .delete('/:id', KrsController.delete, deleteKrsSchema);

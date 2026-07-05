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
  getPendingStudentsSchema,
  updateKrsSchema,
} from '../schemas/krs.schema';

export const krsRoutes = new Elysia({ prefix: '/krs' })
  .use(authMiddleware)
  .get('/', KrsController.getAll, getKrsSchema)
  .post('/', KrsController.create, createKrsSchema)
  .post('/approve', KrsController.approve, approveKrsSchema)
  .get('/pending-students', KrsController.getPendingStudents, getPendingStudentsSchema)
  .post('/approve-batch', KrsController.approveBatch, approveBatchKrsSchema)
  .post('/import', KrsController.importCsv)
  .get('/:id', KrsController.getById, getKrsByIdSchema)
  .put('/:id', KrsController.update, updateKrsSchema)
  .delete('/:id', KrsController.delete, deleteKrsSchema);

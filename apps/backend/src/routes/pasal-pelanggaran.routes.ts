import { Elysia } from 'elysia';
import { PasalPelanggaranController } from '../controllers/pasal.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  bulkDeletePasalSchema,
  createPasalSchema,
  deletePasalSchema,
  getAllPasalSchema,
  importPasalSchema,
  updatePasalSchema,
} from '../schemas/pasal-pelanggaran.schema';

export const pasalPelanggaranRoutes = new Elysia({ prefix: '/pasal-pelanggaran' })
  .use(authMiddleware)
  .get('/', PasalPelanggaranController.getAll, getAllPasalSchema)
  .post('/', PasalPelanggaranController.create, createPasalSchema)
  .post('/import', PasalPelanggaranController.importCsv, importPasalSchema)
  .post('/bulk-delete', PasalPelanggaranController.bulkRemove, bulkDeletePasalSchema)
  .put('/:id', PasalPelanggaranController.update, updatePasalSchema)
  .delete('/:id', PasalPelanggaranController.remove, deletePasalSchema);

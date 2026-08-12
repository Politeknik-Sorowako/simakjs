import { Elysia } from 'elysia';
import { PasalPelanggaranController } from '../controllers/pasal.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  createPasalSchema,
  deletePasalSchema,
  getAllPasalSchema,
  updatePasalSchema,
} from '../schemas/pasal-pelanggaran.schema';

export const pasalPelanggaranRoutes = new Elysia({ prefix: '/pasal-pelanggaran' })
  .use(authMiddleware)
  .get('/', PasalPelanggaranController.getAll, getAllPasalSchema)
  .post('/', PasalPelanggaranController.create, createPasalSchema)
  .put('/:id', PasalPelanggaranController.update, updatePasalSchema)
  .delete('/:id', PasalPelanggaranController.remove, deletePasalSchema);

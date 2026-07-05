import { Elysia } from 'elysia';
import { BapController } from '../controllers/bap.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { createBapSchema, getBapByKelasSchema, getRpsTopikByKelasSchema, updateBapSchema } from '../schemas/bap.schema';

export const bapRoutes = new Elysia({ prefix: '/bap' })
  .use(authMiddleware)
  .get('/kelas/:kelasKuliahId', BapController.getByKelas, getBapByKelasSchema)
  .get('/kelas/:kelasKuliahId/topik', BapController.getRpsTopik, getRpsTopikByKelasSchema)
  .post('/', BapController.create, createBapSchema)
  .put('/:id', BapController.update, updateBapSchema);

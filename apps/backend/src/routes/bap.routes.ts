import { Elysia } from 'elysia';
import { BapController } from '../controllers/bap.controller';
import { createBapSchema, getBapByKelasSchema } from '../schemas/bap.schema';
import { authMiddleware } from '../middlewares/auth.middleware';

export const bapRoutes = new Elysia({ prefix: '/bap' })
  .use(authMiddleware)
  .get('/kelas/:kelasKuliahId', BapController.getByKelas, getBapByKelasSchema)
  .post('/', BapController.create, createBapSchema);
